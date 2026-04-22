# Research-X-Github

Bot diario que descubre repos GitHub relevantes para Claude / Claude Code / MCP, los analiza con Claude Opus 4.7 y envía reporte Top 5 por Telegram a las 23:00 ART.

## Setup

```bash
cp .env.example .env
# editar .env con tus secretos
npm install
npm run test:telegram   # verifica llegada
npm start               # corrida manual
```

## Deploy en Hetzner

```bash
# en server
cd /opt/research-x-github
git pull
npm install --omit=dev
bash scripts/install-cron.sh
```

## Arquitectura

Ver `/root/.claude/plans/quiero-crear-un-bot-shimmering-shore.md`.

## Fuentes actuales

- GitHub Search API (queries Claude/MCP)
- GitHub Trending + topics/claude
- Awesome-lists curadas

Fase 2: Twitter/X via Nitter.
