import 'dotenv/config';

const REQUIRED = [
  'GITHUB_TOKEN',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
];

function read() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[config] missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
  return {
    githubToken: process.env.GITHUB_TOKEN,
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    model: process.env.MODEL || 'opus',
    maxReposAnalyzed: parseInt(process.env.MAX_REPOS_ANALYZED || '30', 10),
    topN: parseInt(process.env.TOP_N || '5', 10),
  };
}

export const config = read();
