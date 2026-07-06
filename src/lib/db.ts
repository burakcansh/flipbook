import fs from "fs";
import path from "path";
import type { Book } from "./types";
import { supabaseEnabled, supabaseAdmin } from "./supabase";

export interface User {
  id: string;
  email: string;
  name: string;
  salt: string;
  hash: string;
  createdAt: number;
}

/**
 * Data adapter: uses Supabase Postgres when configured (production/Vercel),
 * otherwise a local file-based JSON store (development).
 */

/* ---------------- row mapping (Supabase snake_case ↔ camelCase) ---------- */

type BookRow = {
  id: string;
  owner_id: string;
  theme_key: string;
  cover: Book["cover"];
  pages: Book["pages"];
  music: Book["music"];
  view_password: string | null;
  status: string;
  slug: string | null;
  created_at: number;
  updated_at: number;
};

function rowToBook(r: BookRow): Book {
  return {
    id: r.id,
    ownerId: r.owner_id,
    themeKey: r.theme_key as Book["themeKey"],
    cover: r.cover,
    pages: r.pages ?? [],
    music: r.music ?? [],
    viewPassword: r.view_password,
    status: r.status as Book["status"],
    slug: r.slug,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

function bookToRow(b: Book): BookRow {
  return {
    id: b.id,
    owner_id: b.ownerId,
    theme_key: b.themeKey,
    cover: b.cover,
    pages: b.pages,
    music: b.music ?? [],
    view_password: b.viewPassword ?? null,
    status: b.status,
    slug: b.slug,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  };
}

/* ---------------- file-based fallback ------------------------------------ */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface DbShape {
  books: Record<string, Book>;
  users: Record<string, User>;
}

function ensureFile(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ books: {}, users: {} }, null, 2),
      "utf8"
    );
  }
}

function readDb(): DbShape {
  ensureFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DbShape;
    if (!parsed.books) parsed.books = {};
    if (!parsed.users) parsed.users = {};
    return parsed;
  } catch {
    return { books: {}, users: {} };
  }
}

function writeDb(db: DbShape): void {
  ensureFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

/* ---------------- books -------------------------------------------------- */

export async function listBooksByOwner(ownerId: string): Promise<Book[]> {
  if (supabaseEnabled) {
    const { data } = await supabaseAdmin()
      .from("books")
      .select("*")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });
    return (data ?? []).map((r) => rowToBook(r as BookRow));
  }
  return Object.values(readDb().books)
    .filter((b) => b.ownerId === ownerId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getBook(id: string): Promise<Book | null> {
  if (supabaseEnabled) {
    const { data } = await supabaseAdmin()
      .from("books")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? rowToBook(data as BookRow) : null;
  }
  return readDb().books[id] ?? null;
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  if (supabaseEnabled) {
    const { data } = await supabaseAdmin()
      .from("books")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    return data ? rowToBook(data as BookRow) : null;
  }
  return (
    Object.values(readDb().books).find(
      (b) => b.slug === slug && b.status === "published"
    ) ?? null
  );
}

export async function listPublishedByOwner(ownerId: string): Promise<Book[]> {
  if (supabaseEnabled) {
    const { data } = await supabaseAdmin()
      .from("books")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("status", "published")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false });
    return (data ?? []).map((r) => rowToBook(r as BookRow));
  }
  return Object.values(readDb().books)
    .filter((b) => b.ownerId === ownerId && b.status === "published" && b.slug)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function slugExists(slug: string): Promise<boolean> {
  if (supabaseEnabled) {
    const { data } = await supabaseAdmin()
      .from("books")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    return !!data;
  }
  return Object.values(readDb().books).some((b) => b.slug === slug);
}

export async function saveBook(book: Book): Promise<Book> {
  if (supabaseEnabled) {
    await supabaseAdmin().from("books").upsert(bookToRow(book));
    return book;
  }
  const db = readDb();
  db.books[book.id] = book;
  writeDb(db);
  return book;
}

export async function deleteBook(id: string): Promise<void> {
  if (supabaseEnabled) {
    await supabaseAdmin().from("books").delete().eq("id", id);
    return;
  }
  const db = readDb();
  delete db.books[id];
  writeDb(db);
}

/* ---------------- users -------------------------------------------------- */

export async function getUserByEmail(email: string): Promise<User | null> {
  const norm = email.trim().toLowerCase();
  if (supabaseEnabled) {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("*")
      .eq("email", norm)
      .maybeSingle();
    if (!data) return null;
    return { ...data, createdAt: Number(data.created_at) } as User;
  }
  return Object.values(readDb().users).find((u) => u.email === norm) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  if (supabaseEnabled) {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return { ...data, createdAt: Number(data.created_at) } as User;
  }
  return readDb().users[id] ?? null;
}

export async function saveUser(user: User): Promise<User> {
  if (supabaseEnabled) {
    await supabaseAdmin().from("users").upsert({
      id: user.id,
      email: user.email,
      name: user.name,
      salt: user.salt,
      hash: user.hash,
      created_at: user.createdAt,
    });
    return user;
  }
  const db = readDb();
  db.users[user.id] = user;
  writeDb(db);
  return user;
}

/** Reassigns every book owned by `fromOwnerId` to `toOwnerId`. */
export async function reassignBooks(
  fromOwnerId: string,
  toOwnerId: string
): Promise<void> {
  if (!fromOwnerId || fromOwnerId === toOwnerId) return;
  if (supabaseEnabled) {
    await supabaseAdmin()
      .from("books")
      .update({ owner_id: toOwnerId })
      .eq("owner_id", fromOwnerId);
    return;
  }
  const db = readDb();
  let changed = false;
  for (const book of Object.values(db.books)) {
    if (book.ownerId === fromOwnerId) {
      book.ownerId = toOwnerId;
      changed = true;
    }
  }
  if (changed) writeDb(db);
}
