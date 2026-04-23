import { NextResponse } from "next/server";
import { getRecentEvents, getLiveStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = getRecentEvents(80);
  const stats = getLiveStats();
  return NextResponse.json({ events, stats, timestamp: new Date().toISOString() });
}
