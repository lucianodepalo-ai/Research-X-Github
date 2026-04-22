import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Octokit } from '@octokit/rest';
import { config } from '../config.js';

const execFileP = promisify(execFile);
const octokit = new Octokit({ auth: config.githubToken });

const SYSTEM_PROMPT = `Sos asistente técnico para Luciano, dev full-stack argentino.

Perfil Luciano:
- Proyecto principal: Wando (SaaS WhatsApp Business, Next.js + PostgreSQL, deploy Hetzner)
- Stack: Node.js, TypeScript, Next.js, React, PostgreSQL
- Intereses: tools Claude / Claude Code, MCP servers, agentes IA, automatización dev, SDKs Anthropic

Tu tarea: evaluar repos GitHub relacionados con Claude / Anthropic / MCP y devolver score + resumen + caso de uso concreto. Pensá en qué tan aplicable es a Wando o al workflow de desarrollo con Claude Code.

Criterios de score (1-10):
- 10: imprescindible, aplicación directa a Wando o reemplaza tool que Luciano usa
- 7-9: muy útil, aplicable con adaptación
- 4-6: interesante, útil en el futuro o de referencia
- 1-3: tangencial, no vale la pena

Respondé únicamente JSON válido según el schema pedido. Nada más, nada menos.`;

const OUTPUT_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    score: { type: 'integer', minimum: 1, maximum: 10 },
    summary: { type: 'string' },
    use_case: { type: 'string' },
  },
  required: ['score', 'summary', 'use_case'],
  additionalProperties: false,
});

async function fetchReadme(fullName) {
  const [owner, repo] = fullName.split('/');
  try {
    const { data } = await octokit.repos.getReadme({ owner, repo });
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

function truncate(text, maxChars = 8000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[... README truncado ...]';
}

async function runClaudeCli(userPrompt) {
  const args = [
    '--print',
    '--output-format', 'json',
    '--system-prompt', SYSTEM_PROMPT,
    '--json-schema', OUTPUT_SCHEMA,
    '--model', config.model,
    '--tools', '',
    '--no-session-persistence',
    userPrompt,
  ];
  const { stdout } = await execFileP('claude', args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 180_000,
    input: '',
  });
  const envelope = JSON.parse(stdout);
  if (envelope.is_error) {
    throw new Error(`claude CLI error: ${envelope.result || 'unknown'}`);
  }
  if (envelope.structured_output) return envelope.structured_output;
  if (envelope.result) return JSON.parse(envelope.result);
  throw new Error('claude CLI: sin structured_output ni result');
}

async function analyzeOne(repo) {
  const readme = await fetchReadme(repo.full_name);
  const userPrompt = `Repo: ${repo.full_name}
URL: ${repo.html_url}
Stars: ${repo.stars}
Lenguaje: ${repo.language || 'N/A'}
Descripción: ${repo.description || '(sin descripción)'}

README:
${truncate(readme)}`;

  try {
    const parsed = await runClaudeCli(userPrompt);
    return { ...repo, ...parsed };
  } catch (err) {
    console.error(`[analyze] ${repo.full_name}:`, err.message);
    return null;
  }
}

export async function analyzeRepos(repos, { concurrency = 2 } = {}) {
  const results = [];
  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(analyzeOne));
    results.push(...batchResults.filter(Boolean));
    console.log(`[analyze] ${results.length}/${repos.length} listos`);
  }
  return results.sort((a, b) => b.score - a.score);
}
