# Research-X — Roadmap de fuentes futuras

## Estado actual (funcionando)
- ✅ GitHub Search (25 queries, 3 tiers por relevancia)
- ✅ GitHub Trending (daily + topics claude/anthropic/mcp)
- ✅ Awesome-lists (8 listas curadas)
- ✅ Blog Anthropic (scraping cada 2h)
- ✅ Twitter/X vía RSS (cuando se configuren feeds en rss.app/FetchRSS)

---

## Twitter — Setup pendiente (manual, en el browser)

### Distribución de las 12 cuentas

**rss.app (3 gratis)** → https://rss.app
1. @ClaudeDevs
2. @claudeai
3. @LunarResearcher

**FetchRSS (5 gratis)** → https://fetchrss.com
4. @ErickSky
5. @franpradasAI
6. @_guillecasaus
7. @GitHub_Daily
8. @GitHubCommunity

**Servicio 3 — 4 cuentas restantes** (a definir):
9. @estoicc
10. @ecommartinez
11. @noisyb0y1
12. @openclaw

Opciones para las 4 restantes:
- Crear segunda cuenta en rss.app con otro email → 3 más
- Buscar instancia Nitter que funcione para esas cuentas
- Monitorear mensualmente si son menos activas

### Proceso de setup
1. Ir a rss.app → crear cuenta → "New Feed" → "Twitter Profile" → pegar @handle → copiar URL generada
2. Editar `monitor/sources/twitter_rss.py` → sección `TWITTER_RSS_FEEDS` → pegar handle: URL
3. `pm2 restart research-x-monitor --update-env`

---

## Fuentes Fase 2 (próximas a implementar)

### Reddit (gratuito, sin autenticación)
Reddit tiene API JSON pública y RSS nativos.
- `r/ClaudeAI` → `https://reddit.com/r/ClaudeAI/new.json`
- `r/LocalLLaMA` → `https://reddit.com/r/LocalLLaMA/new.json`
- `r/MachineLearning` → `https://reddit.com/r/MachineLearning/hot.json`
- `r/artificial` → `https://reddit.com/r/artificial/hot.json`
- `r/ChatGPT` (para comparar tendencias)
- Filtrar por keywords: claude, anthropic, mcp, agent

**Implementación:** `monitor/sources/reddit.py` — fetch JSON cada 2h, filtrar por score > 50 upvotes + keywords

### Hacker News (gratuito, API oficial)
HN tiene API pública sin auth: `https://hacker-news.firebaseio.com/v0/`
- Monitorear `newstories` y `topstories`
- Filtrar posts con `claude` o `anthropic` en título
- Score > 100 puntos para notificar

**Implementación:** `monitor/sources/hackernews.py` — fetch cada 2h

### GitHub Releases (nuevo)
Monitorear releases de repos importantes:
- `anthropics/anthropic-sdk-python`
- `anthropics/anthropic-sdk-js`
- `modelcontextprotocol/sdk-python`
- `modelcontextprotocol/sdk-js`
- `withastro/astro` (si Claude Code lo usa)

**Implementación:** usar GitHub API `/repos/{owner}/{repo}/releases` — sin rate limit preocupante

### YouTube (posible, gratuito)
Canales relevantes tienen RSS nativo:
- `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`
- Canales: Anthropic oficial, AI Explained, Two Minute Papers

**Implementación:** `monitor/sources/youtube.py` — RSS feed, notificar solo nuevos videos

---

## Mejoras futuras al análisis

### GitHub scoring mejorado
- Detectar si el repo es un MCP server oficial vs community
- Detectar si tiene releases activos (señal de mantenimiento)
- Detectar si el autor trabaja en Anthropic (señal alta)
- Peso extra a repos en TypeScript/Python (stack de Luciano)

### Sistema de tags/temas
En lugar de categorías fijas, detectar automáticamente temas:
- `#claude-code-extension` `#mcp-server` `#agent-framework`
- `#prompt-engineering` `#cost-optimization` `#computer-use`

### Digest semanal
Además del reporte diario: resumen semanal de lo más importante.
- Top 5 repos de la semana
- Top 5 tweets más relevantes
- Novedades de Anthropic
- Posts de HN/Reddit más votados

---

## Infraestructura futura
- Webhook receiver para IFTTT/Make si se consigue plan con más applets
- Dashboard: página /reddit y /hackernews
- Búsqueda unificada en dashboard (repos + tweets + blog + reddit)
