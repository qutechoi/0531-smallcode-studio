export type SmallcodeRequest = {
  repoPath: string;
  prompt: string;
};

export type LogLine = {
  level: 'info' | 'error' | 'status';
  text: string;
};

export type DiffStats = {
  files: number;
  additions: number;
  deletions: number;
};

const UNSAFE_PATH_CHARS = /[;&|`$<>\n\r]/;

export function buildSmallcodeArgs(request: SmallcodeRequest): string[] {
  const repoPath = request.repoPath.trim();
  const prompt = request.prompt.trim();

  if (!repoPath) {
    throw new Error('Repository path is required.');
  }

  if (UNSAFE_PATH_CHARS.test(repoPath)) {
    throw new Error('Unsafe repository path. Shell metacharacters are not allowed.');
  }

  if (!prompt) {
    throw new Error('Task prompt is required.');
  }

  return ['--cwd', repoPath, prompt];
}

export function parseRunLog(raw: string): LogLine[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith('err:')) {
        return { level: 'error', text: line.slice(4).trim() } satisfies LogLine;
      }
      if (line.startsWith('exit:')) {
        return { level: 'status', text: `exit code ${line.slice(5).trim()}` } satisfies LogLine;
      }
      if (line.startsWith('out:')) {
        return { level: 'info', text: line.slice(4).trim() } satisfies LogLine;
      }
      return { level: 'info', text: line } satisfies LogLine;
    });
}

export function summarizeDiffStats(statText: string): DiffStats {
  const summaryLine = statText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /files? changed/.test(line));

  if (!summaryLine) {
    return { files: 0, additions: 0, deletions: 0 };
  }

  const files = Number(summaryLine.match(/(\d+) files? changed/)?.[1] ?? 0);
  const additions = Number(summaryLine.match(/(\d+) insertions?\(\+\)/)?.[1] ?? 0);
  const deletions = Number(summaryLine.match(/(\d+) deletions?\(-\)/)?.[1] ?? 0);

  return { files, additions, deletions };
}
