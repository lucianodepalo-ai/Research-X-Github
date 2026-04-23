import { Octokit } from '@octokit/rest';
import { config } from '../config.js';

const octokit = new Octokit({ auth: config.githubToken });

/**
 * Queries organizadas en 3 tiers por especificidad y umbral de estrellas.
 *
 * TIER 1 — Muy específicas a Claude/MCP (señal alta, umbral bajo)
 *   Cualquier repo con estas keywords es relevante por definición.
 *
 * TIER 2 — IA + Anthropic (señal media, umbral medio)
 *   Más ruido posible, filtramos con más estrellas.
 *
 * TIER 3 — Agentes y LLMs en general (señal amplia, umbral alto)
 *   Solo queremos los que ya tienen tracción real.
 */
const SEARCH_TIERS = [
  // TIER 1 — stars:>3, recientes (7d creados / 3d pusheados)
  { terms: ['claude-code', 'mcp-server', 'claude-agent', 'model-context-protocol', 'claude desktop', 'computer-use anthropic', 'claude hooks', 'claude skills', 'anthropic sdk', 'claude api tools'], stars: 3, createdDays: 7, pushedDays: 3 },

  // TIER 2 — stars:>15, algo más recientes
  { terms: ['claude', 'anthropic', 'mcp tools', 'claude prompt', 'claude workflow', 'llm agent claude', 'claude code extension', 'agentic workflow', 'prompt caching anthropic'], stars: 15, createdDays: 14, pushedDays: 5 },

  // TIER 3 — stars:>40, ventana más amplia
  { terms: ['ai agent framework', 'autonomous agent llm', 'multi agent ai', 'llm orchestration', 'ai coding assistant', 'ai developer tools'], stars: 40, createdDays: 21, pushedDays: 7 },
];

/**
 * Awesome-lists adicionales con repos curados sobre Claude Code y agentes.
 * Complementa la búsqueda con repos que ya tienen reconocimiento de comunidad.
 */
export const EXTRA_AWESOME_LISTS = [
  'anthropics/anthropic-cookbook',
  'wong2/awesome-gpt-prompts',
  'f/awesome-chatgpt-prompts',
  'awesome-selfhosted/awesome-selfhosted',
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchSearchRepos() {
  const results = new Map();
  let queryCount = 0;

  for (const tier of SEARCH_TIERS) {
    const createdSince = isoDaysAgo(tier.createdDays);
    const pushedSince = isoDaysAgo(tier.pushedDays);

    for (const term of tier.terms) {
      const q = `${term} stars:>${tier.stars} (created:>${createdSince} OR pushed:>${pushedSince})`;
      try {
        const { data } = await octokit.search.repos({
          q,
          sort: 'stars',
          order: 'desc',
          per_page: 30,
        });
        for (const r of data.items) {
          if (!results.has(r.id)) results.set(r.id, toRepo(r));
        }
        console.log(`[search] "${term}" stars:>${tier.stars} → ${data.items.length} repos`);
        queryCount++;
        // Respetar rate limit de GitHub Search (10 req/min sin token, 30/min con token)
        if (queryCount % 8 === 0) await delay(2000);
      } catch (err) {
        console.error(`[search] query "${term}" falló:`, err.message);
      }
    }
  }

  console.log(`[search] total único: ${results.size} repos de ${queryCount} queries`);
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
