import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { getOwnerIdFromRequest } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ownerId = getOwnerIdFromRequest(req);
  if (!ownerId) return NextResponse.json({ user: null });
  const user = await getUserById(ownerId);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}
