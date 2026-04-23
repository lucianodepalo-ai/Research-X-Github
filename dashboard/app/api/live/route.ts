import { NextResponse } from "next/server";
import { getRecentEvents, getLiveStats, getBlogPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = getRecentEvents(80);
  const stats = getLiveStats();
  const { posts: recentArticles } = getBlogPosts({ pageSize: 8 });
  return NextResponse.json({
    events,
    stats,
    recentArticles,
    timestamp: new Date().toISOString(),
  });
}
