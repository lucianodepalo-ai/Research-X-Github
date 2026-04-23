import { request } from 'undici';
import { Octokit } from '@octokit/rest';
import { config } from '../config.js';

const octokit = new Octokit({ auth: config.githubToken });

const AWESOME_LISTS = [
  // Claude / Claude Code específicos
  'hesreallyhim/awesome-claude-code',
  'yzfly/Awesome-Claude-Prompts',
  // MCP
  'modelcontextprotocol/servers',
  'punkpeye/awesome-mcp-servers',
  // Anthropic oficial
  'anthropics/anthropic-cookbook',
  // Agentes IA
  'e2b-dev/awesome-ai-agents',
  'slavakurilyak/awesome-ai-agents',
  // LLMs general (filtrados luego por score)
  'Shubhamsaboo/awesome-llm-apps',
];

const GITHUB_LINK_RE = /https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:[/#)\s]|$)/g;

async function fetchRawReadme(fullName) {
  for (const branch of ['main', 'master']) {
    const url = `https://raw.githubusercontent.com/${fullName}/${branch}/README.md`;
    try {
      const { body, statusCode } = await request(url);
      if (statusCode === 200) return await body.text();
    } catch {
      /* try next */
    }
  }
  return '';
}

function extractRepos(markdown, selfFullName) {
  const found = new Set();
  for (const match of markdown.matchAll(GITHUB_LINK_RE)) {
    const owner = match[1];
    let repo = match[2].replace(/\.git$/, '');
    // Skip common non-repo paths
    if (['sponsors', 'orgs', 'topics', 'collections', 'marketplace'].includes(owner)) continue;
    const full = `${owner}/${repo}`;
    if (full === selfFullName) continue;
    found.add(full);
  }
  return [...found];
}

async function hydrate(fullName) {
  const [owner, repo] = fullName.split('/');
  try {
    const { data: r } = await octokit.repos.get({ owner, repo });
    return {
      id: r.id,
      full_name: r.full_name,
      html_url: r.html_url,
      description: r.description || '',
      stars: r.stargazers_count,
      language: r.language,
      created_at: r.created_at,
      pushed_at: r.pushed_at,
      source: 'awesome',
    };
  } catch {
    return null;
  }
}

export async function fetchAwesomeRepos() {
  const all = new Set();
  for (const list of AWESOME_LISTS) {
    const md = await fetchRawReadme(list);
    extractRepos(md, list).forEach((n) => all.add(n));
  }
  // Cap ampliado: más listas = más repos curados
  const limited = [...all].slice(0, 80);
  const hydrated = await Promise.all(limited.map(hydrate));
  return hydrated.filter(Boolean);
}
