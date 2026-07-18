import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBookBySlug } from "@/lib/db";
import { getTheme } from "@/lib/themes";
import ViewerScreen from "@/components/ViewerScreen";
import ViewerGate from "@/components/ViewerGate";
import SiteViewer from "@/components/SiteViewer";
import type { PublicBook } from "@/lib/types";

export const dynamic = "force-dynamic";
// Never read a cached book here — a removed password / new page must show up
// on the very next load, so the Supabase read must not hit Next's data cache.
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const book = await getBookBySlug(params.slug);
  if (!book) {
    return { title: "Kitap bulunamadı — Flipbook" };
  }

  // Hosted site → show the admin-chosen name as the page/share title.
  if (book.cover.docType === "site") {
    const siteName =
      book.cover.name || book.cover.title || "Web";
    const desc = book.cover.subtitle || undefined;
    return {
      title: siteName,
      description: desc,
      openGraph: { title: siteName, ...(desc ? { description: desc } : {}) },
      twitter: { title: siteName, ...(desc ? { description: desc } : {}) },
    };
  }

  const title = book.cover.title || "Adsız kitap";

  // Locked books must not leak content into OG/metadata.
  if (book.viewPassword) {
    return {
      title: `${title} — Flipbook`,
      description: "Bu kitap şifre ile korunuyor.",
    };
  }

  const description =
    book.cover.subtitle ||
    `${getTheme(book.themeKey).name} temasında bir Flipbook kitabı.`;
  const firstVideo = book.pages.find(
    (p) => p.kind === "video" && p.video?.thumbnail
  );
  const ogImage = firstVideo?.video?.thumbnail;

  return {
    title: `${title} — Flipbook`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function PublicBookPage({
  params,
}: {
  params: { slug: string };
}) {
  const book = await getBookBySlug(params.slug);
  if (!book) notFound();

  // Password-protected → render an unlock gate (no content in the HTML).
  if (book.viewPassword) {
    return (
      <ViewerGate
        slug={params.slug}
        title={book.cover.name || book.cover.title || ""}
        themeKey={book.themeKey}
      />
    );
  }

  // Hosted HTML site → render the uploaded document full-screen from its own
  // route (real URL so in-page links work).
  if (book.cover.docType === "site") {
    return <SiteViewer src={`/b/${params.slug}/raw`} />;
  }

  const { ownerId, viewPassword, ...rest } = book;
  const publicBook: PublicBook = rest;
  return <ViewerScreen book={publicBook} />;
}
