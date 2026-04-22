import { NextRequest, NextResponse } from "next/server";
import { getAllRepos } from "@/lib/queries";
import type { Repo } from "@/lib/types";

function toCSV(repos: Repo[]): string {
  const headers = [
    "id", "full_name", "html_url", "description", "stars", "language",
    "source", "score", "summary", "use_case", "bookmarked",
    "added_manually", "first_seen_at", "reported_at",
  ];

  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = repos.map((r) =>
    headers.map((h) => escape(r[h as keyof Repo])).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const repos = getAllRepos();

  if (format === "csv") {
    return new NextResponse(toCSV(repos), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="repos-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(repos, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="repos-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
