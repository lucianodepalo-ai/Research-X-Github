import { request } from 'undici';
import { config } from '../config.js';

const MD_SPECIAL = /([_*\[\]()~`>#+\-=|{}.!\\])/g;

function escape(s) {
  if (s == null) return '';
  return String(s).replace(MD_SPECIAL, '\\$1');
}

function formatRepo(repo, idx) {
  const stars = repo.stars != null ? `⭐${repo.stars}` : '';
  const score = `*${repo.score}/10*`;
  const header = `*${idx}\\. [${escape(repo.full_name)}](${repo.html_url})*  ·  ${stars}  ·  ${score}`;
  return `${header}
${escape(repo.summary)}
💡 ${escape(repo.use_case)}`;
}

function buildMessage(repos) {
  const date = new Date().toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const header = `🤖 *Research Claude — ${escape(date)}*`;
  if (repos.length === 0) {
    return `${header}\n\n_No hay repos nuevos hoy\\._`;
  }
  const body = repos.map((r, i) => formatRepo(r, i + 1)).join('\n\n');
  const footer = `\n\n_Fuentes: GitHub Search \\+ Trending \\+ Awesome\\-lists_`;
  return `${header}\n\n${body}${footer}`;
}

async function sendMessage(text, { markdown = true } = {}) {
  const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
  const payload = {
    chat_id: config.telegramChatId,
    text,
    disable_web_page_preview: true,
  };
  if (markdown) payload.parse_mode = 'MarkdownV2';
  const { statusCode, body } = await request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const responseText = await body.text();
  if (statusCode !== 200) {
    throw new Error(`Telegram API ${statusCode}: ${responseText}`);
  }
  return JSON.parse(responseText);
}

export async function send(text) {
  return sendMessage(text, { markdown: false });
}

export async function sendReport(repos) {
  const message = buildMessage(repos);
  if (message.length <= 4096) {
    return sendMessage(message);
  }
  const half = Math.ceil(repos.length / 2);
  await sendMessage(buildMessage(repos.slice(0, half)));
  return sendMessage(buildMessage(repos.slice(half)));
}
