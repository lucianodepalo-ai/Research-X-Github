import { config } from './config.js';
import { fetchSearchRepos } from './sources/github-search.js';
import { fetchTrendingRepos } from './sources/github-trending.js';
import { fetchAwesomeRepos } from './sources/awesome-lists.js';
import { analyzeRepos } from './analyze/claude.js';
import { sendReport } from './report/telegram.js';
import { isReported, markSeen, markReported, getStaleReportedIds } from './state/db.js';

async function main() {
  const t0 = Date.now();
  console.log('[main] iniciando Research-X-Github');

  const [searchRepos, trendingRepos, awesomeRepos] = await Promise.all([
    fetchSearchRepos(),
    fetchTrendingRepos(),
    fetchAwesomeRepos(),
  ]);
  console.log(
    `[main] fuentes: search=${searchRepos.length} trending=${trendingRepos.length} awesome=${awesomeRepos.length}`,
  );

  const merged = new Map();
  for (const r of [...searchRepos, ...trendingRepos, ...awesomeRepos]) {
    if (!merged.has(r.id)) merged.set(r.id, r);
  }
  console.log(`[main] merged únicos: ${merged.size}`);

  const allRepos = [...merged.values()];
  const candidates = allRepos.filter((r) => !isReported(r.id));
  console.log(`[main] tras dedup histórico: ${candidates.length}`);

  for (const r of allRepos) markSeen(r);

  let pool = candidates.sort((a, b) => b.stars - a.stars);

  // Fallback: if fewer than topN fresh repos, include stale (reported >30 days ago)
  if (pool.length < config.topN) {
    const staleIds = getStaleReportedIds(30);
    const stale = allRepos
      .filter((r) => staleIds.has(r.id))
      .sort((a, b) => b.stars - a.stars);
    pool = [...pool, ...stale];
    console.log(`[main] fallback stale: pool ahora ${pool.length}`);
  }

  const limited = pool.slice(0, config.maxReposAnalyzed);
  console.log(`[main] analizando top ${limited.length} por stars`);

  const analyzed = await analyzeRepos(limited);
  const topN = analyzed.slice(0, config.topN);
  if (topN.length < config.topN) {
    console.warn(`[main] ⚠️ solo ${topN.length}/${config.topN} repos disponibles hoy`);
  }
  console.log(`[main] top ${topN.length} seleccionados`);

  if (topN.length > 0) {
    await sendReport(topN);
    for (const r of topN) markReported(r.id, r);
  } else {
    await sendReport([]);
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[main] done en ${secs}s — reportados: ${topN.length}`);
}

main().catch((err) => {
  console.error('[main] fatal:', err);
  process.exit(1);
});
