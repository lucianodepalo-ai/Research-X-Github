import { Octokit } from '@octokit/rest';
import { config } from '../config.js';

const octokit = new Octokit({ auth: config.githubToken });

const QUERIES = [
  'claude',
  'claude-code',
  'anthropic',
  'mcp-server',
  'claude-agent',
  'model-context-protocol',
];

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function toRepo(r) {
  return {
    id: r.id,
    full_name: r.full_name,
    html_url: r.html_url,
    description: r.description || '',
    stars: r.stargazers_count,
    language: r.language,
    created_at: r.created_at,
    pushed_at: r.pushed_at,
    source: 'search',
  };
}

export async function fetchSearchRepos() {
  const createdSince = isoDaysAgo(7);
  const pushedSince = isoDaysAgo(3);
  const results = new Map();

  for (const term of QUERIES) {
    const q = `${term} stars:>5 (created:>${createdSince} OR pushed:>${pushedSince})`;
    try {
      const { data } = await octokit.search.repos({
        q,
        sort: 'stars',
        order: 'desc',
        per_page: 30,
      });
      for (const r of data.items) results.set(r.id, toRepo(r));
    } catch (err) {
      console.error(`[search] query "${term}" falló:`, err.message);
    }
  }
  return [...results.values()];
}

export async function fetchReadme(fullName) {
  const [owner, repo] = fullName.split('/');
  try {
    const { data } = await octokit.repos.getReadme({ owner, repo });
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (err) {
    if (err.status === 404) return '';
    console.error(`[readme] ${fullName}:`, err.message);
    return '';
  }
}
