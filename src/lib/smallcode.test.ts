import { describe, expect, it } from 'vitest';
import { buildSmallcodeArgs, parseRunLog, summarizeDiffStats } from './smallcode';

describe('buildSmallcodeArgs', () => {
  it('builds safe smallcode arguments from a repo path and prompt', () => {
    expect(buildSmallcodeArgs({ repoPath: '/tmp/demo-app', prompt: 'fix failing tests' })).toEqual([
      '--cwd',
      '/tmp/demo-app',
      'fix failing tests',
    ]);
  });

  it('rejects empty prompts and shell metacharacters in repo paths', () => {
    expect(() => buildSmallcodeArgs({ repoPath: '/tmp/demo; rm -rf /', prompt: 'fix' })).toThrow(/unsafe/i);
    expect(() => buildSmallcodeArgs({ repoPath: '/tmp/demo', prompt: '   ' })).toThrow(/prompt/i);
  });
});

describe('parseRunLog', () => {
  it('classifies stdout, stderr, and exit status lines for the live log panel', () => {
    const lines = parseRunLog('out: planning\nerr: missing tests\nexit: 1');
    expect(lines).toEqual([
      { level: 'info', text: 'planning' },
      { level: 'error', text: 'missing tests' },
      { level: 'status', text: 'exit code 1' },
    ]);
  });
});

describe('summarizeDiffStats', () => {
  it('summarizes changed files, additions, and deletions from git diff --stat text', () => {
    expect(summarizeDiffStats('src/App.tsx | 10 +++++-----\nREADME.md | 4 ++++\n2 files changed, 9 insertions(+), 5 deletions(-)')).toEqual({
      files: 2,
      additions: 9,
      deletions: 5,
    });
  });
});
