import { request } from 'undici';
import * as cheerio from 'cheerio';
import { Octokit } from '@octokit/rest';
import { config } from '../config.js';

const octokit = new Octokit({ auth: config.githubToken });

const TRENDING_URLS = [
  'https://github.com/trending?since=daily',
  'https://github.com/topics/claude',
  'https://github.com/topics/anthropic',
  'https://github.com/topics/mcp',
  'https://github.com/topics/model-context-protocol',
];

async function fetchFullNames(url) {
  try {
    const { body, statusCode } = await request(url, {
      headers: { 'user-agent': 'Mozilla/5.0 research-x-bot' },
    });
    if (statusCode !== 200) return [];
    const html = await body.text();
    const $ = cheerio.load(html);
    const names = new Set();

    // /trending uses <h2 class="h3"><a href="/owner/repo">
    $('article h2 a, h3 a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(/^\/([^/\s]+)\/([^/\s#?]+)$/);
      if (m) names.add(`${m[1]}/${m[2]}`);
    });
    return [...names];
  } catch (err) {
    console.error(`[trending] ${url}:`, err.message);
    return [];
  }
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
      source: 'trending',
    };
  } catch {
    return null;
  }
}

export async function fetchTrendingRepos() {
  const allNames = new Set();
  for (const url of TRENDING_URLS) {
    const names = await fetchFullNames(url);
    names.forEach((n) => allNames.add(n));
  }
  // Limit hydration to 40 to save API calls
  const limited = [...allNames].slice(0, 40);
  const hydrated = await Promise.all(limited.map(hydrate));
  return hydrated.filter(Boolean);
}
