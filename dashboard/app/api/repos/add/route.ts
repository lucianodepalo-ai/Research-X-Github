import { NextRequest, NextResponse } from "next/server";
import { fetchGithubRepo } from "@/lib/github";
import { insertManualRepo, getRepo } from "@/lib/queries";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

  try {
    const meta = await fetchGithubRepo(url);

    const existing = getRepo(meta.id);
    if (existing) {
      return NextResponse.json({ id: existing.id, alreadyExists: true });
    }

    insertManualRepo({
      id: meta.id,
      full_name: meta.full_name,
      html_url: meta.html_url,
      description: meta.description,
      stars: meta.stargazers_count,
      language: meta.language,
    });

    return NextResponse.json({ id: meta.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
