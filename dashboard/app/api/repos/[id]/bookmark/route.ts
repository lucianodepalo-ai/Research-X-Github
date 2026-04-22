import { NextRequest, NextResponse } from "next/server";
import { getRepo, toggleBookmark } from "@/lib/queries";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repo = getRepo(Number(id));

  if (!repo) {
    return NextResponse.json({ error: "Repo no encontrado" }, { status: 404 });
  }

  const next = repo.bookmarked === 1 ? 0 : 1;
  toggleBookmark(repo.id, next as 0 | 1);

  return NextResponse.json({ bookmarked: next === 1 });
}
