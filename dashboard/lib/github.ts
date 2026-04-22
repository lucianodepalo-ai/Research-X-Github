export interface GithubRepoMeta {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
}

export async function fetchGithubRepo(url: string): Promise<GithubRepoMeta> {
  const match = url.match(/github\.com\/([^/]+\/[^/\s?#]+)/);
  if (!match) throw new Error("URL de GitHub inválida");

  const repoPath = match[1].replace(/\.git$/, "");
  const token = process.env.GITHUB_TOKEN;

  const res = await fetch(`https://api.github.com/repos/${repoPath}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const msg = res.status === 404 ? "Repositorio no encontrado" : `GitHub API error: ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return {
    id: data.id,
    full_name: data.full_name,
    html_url: data.html_url,
    description: data.description ?? null,
    stargazers_count: data.stargazers_count,
    language: data.language ?? null,
  };
}
