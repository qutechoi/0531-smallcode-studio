import { parseRunLog, summarizeDiffStats, type DiffStats, type LogLine } from './smallcode';

export type InspectResult = {
  ok: boolean;
  repoPath: string;
  smallcodeAvailable: boolean;
  gitAvailable: boolean;
  branch: string;
  status: string;
  message?: string;
};

export type RunResult = {
  ok: boolean;
  log: LogLine[];
  diff: string;
  diffStat: string;
  stats: DiffStats;
  exitCode?: number;
  message?: string;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed: ${response.status}`);
  }
  return payload as T;
}

export async function inspectRepo(repoPath: string): Promise<InspectResult> {
  return postJson<InspectResult>('/api/inspect', { repoPath });
}

export async function runSmallcode(repoPath: string, prompt: string): Promise<RunResult> {
  const payload = await postJson<Omit<RunResult, 'log' | 'stats'> & { rawLog: string }>('/api/run', { repoPath, prompt });
  return {
    ...payload,
    log: parseRunLog(payload.rawLog),
    stats: summarizeDiffStats(payload.diffStat),
  };
}

export async function refreshDiff(repoPath: string): Promise<Pick<RunResult, 'diff' | 'diffStat' | 'stats'>> {
  const payload = await postJson<{ diff: string; diffStat: string }>('/api/diff', { repoPath });
  return {
    ...payload,
    stats: summarizeDiffStats(payload.diffStat),
  };
}
