import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

const unsafePathChars = /[;&|`$<>\n\r]/;

function buildSmallcodeArgs({ repoPath, prompt }) {
  const cleanRepoPath = String(repoPath ?? '').trim();
  const cleanPrompt = String(prompt ?? '').trim();
  if (!cleanRepoPath) throw new Error('Repository path is required.');
  if (unsafePathChars.test(cleanRepoPath)) throw new Error('Unsafe repository path. Shell metacharacters are not allowed.');
  if (!cleanPrompt) throw new Error('Task prompt is required.');
  return ['--cwd', cleanRepoPath, cleanPrompt];
}

const port = Number(process.env.PORT ?? 4173);
const root = resolve('dist');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function run(command, args, options = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: false,
      env: { ...process.env, NO_COLOR: '1' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => resolveRun({ ok: false, stdout, stderr: stderr + error.message, code: 127 }));
    child.on('close', (code) => resolveRun({ ok: code === 0, stdout, stderr, code: code ?? 0 }));
  });
}

async function git(repoPath, args) {
  return run('git', args, { cwd: repoPath });
}

async function inspect(repoPath) {
  if (!repoPath || !existsSync(repoPath)) {
    return { ok: false, repoPath, smallcodeAvailable: false, gitAvailable: false, branch: '', status: '', message: 'Repository path does not exist.' };
  }
  const smallcode = await run('smallcode', ['--help']);
  const branch = await git(repoPath, ['branch', '--show-current']);
  const status = await git(repoPath, ['status', '--short', '--branch']);
  return {
    ok: status.ok,
    repoPath,
    smallcodeAvailable: smallcode.code !== 127,
    gitAvailable: status.code !== 127,
    branch: branch.stdout.trim() || 'detached',
    status: status.stdout.trim() || status.stderr.trim() || 'clean',
  };
}

async function diff(repoPath) {
  const [diffResult, statResult] = await Promise.all([
    git(repoPath, ['diff', '--no-ext-diff']),
    git(repoPath, ['diff', '--stat']),
  ]);
  return { diff: diffResult.stdout || diffResult.stderr, diffStat: statResult.stdout || statResult.stderr };
}

async function handleApi(request, response) {
  try {
    const body = await readJson(request);
    const repoPath = String(body.repoPath ?? '').trim();

    if (request.url === '/api/inspect') {
      return json(response, 200, await inspect(repoPath));
    }

    if (request.url === '/api/diff') {
      return json(response, 200, await diff(repoPath));
    }

    if (request.url === '/api/run') {
      const prompt = String(body.prompt ?? '');
      const args = buildSmallcodeArgs({ repoPath, prompt });
      const result = await run('smallcode', args, { cwd: repoPath });
      const after = await diff(repoPath);
      const rawLog = [
        ...result.stdout.split(/\r?\n/).filter(Boolean).map((line) => `out: ${line}`),
        ...result.stderr.split(/\r?\n/).filter(Boolean).map((line) => `err: ${line}`),
        `exit: ${result.code}`,
      ].join('\n');
      return json(response, 200, { ok: result.ok, rawLog, exitCode: result.code, ...after });
    }

    return json(response, 404, { message: 'Unknown API route.' });
  } catch (error) {
    return json(response, 400, { message: error instanceof Error ? error.message : 'Bad request.' });
  }
}

createServer(async (request, response) => {
  if (request.url?.startsWith('/api/')) {
    return handleApi(request, response);
  }

  const requestPath = request.url === '/' ? '/index.html' : request.url ?? '/index.html';
  const filePath = resolve(join(root, requestPath));
  if (!filePath.startsWith(root)) return json(response, 403, { message: 'Forbidden' });

  try {
    const data = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': mime[extname(filePath)] ?? 'application/octet-stream' });
    response.end(data);
  } catch {
    const data = await readFile(join(root, 'index.html'));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(data);
  }
}).listen(port, () => {
  console.log(`Smallcode Studio running at http://localhost:${port}`);
});
