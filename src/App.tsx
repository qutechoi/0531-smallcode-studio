import { useMemo, useState } from 'react';
import './App.css';
import { inspectRepo, refreshDiff, runSmallcode, type InspectResult, type RunResult } from './lib/api';

type RunState = 'idle' | 'inspecting' | 'running' | 'refreshing' | 'error' | 'done';

const samplePrompts = [
  'Find one small bug and propose a minimal patch.',
  'Run the test suite, identify failures, and fix the smallest issue.',
  'Improve README setup instructions without changing code.',
];

function App() {
  const [repoPath, setRepoPath] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('smallcode-studio.repoPath') ?? '';
  });
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<RunState>('idle');
  const [error, setError] = useState('');
  const [inspect, setInspect] = useState<InspectResult | null>(null);
  const [run, setRun] = useState<RunResult | null>(null);

  const canRun = useMemo(() => repoPath.trim().length > 0 && prompt.trim().length > 0 && state !== 'running', [repoPath, prompt, state]);

  function rememberRepoPath(next: string) {
    setRepoPath(next);
    window.localStorage.setItem('smallcode-studio.repoPath', next);
  }

  async function handleInspect() {
    setState('inspecting');
    setError('');
    try {
      setInspect(await inspectRepo(repoPath));
      setState('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to inspect repository.');
      setState('error');
    }
  }

  async function handleRun() {
    setState('running');
    setError('');
    setRun({
      ok: true,
      rawLog: '',
      log: [{ level: 'status', text: 'starting smallcode…' }],
      diff: '',
      diffStat: '',
      stats: { files: 0, additions: 0, deletions: 0 },
    } as RunResult & { rawLog: string });
    try {
      const result = await runSmallcode(repoPath, prompt);
      setRun(result);
      setState(result.ok ? 'done' : 'error');
      await handleInspect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Smallcode run failed.');
      setState('error');
    }
  }

  async function handleRefreshDiff() {
    setState('refreshing');
    setError('');
    try {
      const diff = await refreshDiff(repoPath);
      setRun((current) => ({
        ok: current?.ok ?? true,
        log: current?.log ?? [],
        exitCode: current?.exitCode,
        message: current?.message,
        ...diff,
      }));
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh diff.');
      setState('error');
    }
  }

  return (
    <main className="shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Review-first local web console</p>
          <h1>Smallcode Studio</h1>
          <p className="lede">
            Run Smallcode against a local repository, watch logs, and inspect Git diffs before you keep any AI-generated patch.
          </p>
        </div>
        <div className="status-pill">Local-first · whitelist-only · diff-first</div>
      </section>

      <section className="grid">
        <form className="panel control-panel" onSubmit={(event) => event.preventDefault()}>
          <label>
            Repository path
            <input
              value={repoPath}
              onChange={(event) => rememberRepoPath(event.target.value)}
              placeholder="/Users/qute/projects/my-app"
            />
          </label>

          <label>
            Task prompt
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask Smallcode for one focused change…"
              rows={6}
            />
          </label>

          <div className="prompt-chips" aria-label="Prompt presets">
            {samplePrompts.map((sample) => (
              <button key={sample} type="button" onClick={() => setPrompt(sample)}>
                {sample}
              </button>
            ))}
          </div>

          <div className="actions">
            <button type="button" className="secondary" onClick={handleInspect} disabled={!repoPath.trim() || state === 'inspecting'}>
              Inspect repo
            </button>
            <button type="button" className="primary" onClick={handleRun} disabled={!canRun}>
              {state === 'running' ? 'Running…' : 'Run Smallcode'}
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </form>

        <aside className="panel repo-panel">
          <h2>Repository guardrails</h2>
          <dl>
            <div><dt>Git</dt><dd>{inspect?.gitAvailable ? 'available' : 'unknown'}</dd></div>
            <div><dt>Smallcode</dt><dd>{inspect?.smallcodeAvailable ? 'available' : 'not detected yet'}</dd></div>
            <div><dt>Branch</dt><dd>{inspect?.branch || '—'}</dd></div>
          </dl>
          <pre className="status-box">{inspect?.status || 'Run Inspect repo to view git status before editing.'}</pre>
        </aside>
      </section>

      <section className="panel metrics-panel">
        <div>
          <span>{run?.stats.files ?? 0}</span>
          <p>files changed</p>
        </div>
        <div>
          <span>+{run?.stats.additions ?? 0}</span>
          <p>insertions</p>
        </div>
        <div>
          <span>-{run?.stats.deletions ?? 0}</span>
          <p>deletions</p>
        </div>
        <button type="button" onClick={handleRefreshDiff} disabled={!repoPath.trim() || state === 'refreshing'}>
          Refresh diff
        </button>
      </section>

      <section className="grid output-grid">
        <div className="panel">
          <h2>Live log</h2>
          <div className="log-panel">
            {(run?.log.length ? run.log : [{ level: 'status' as const, text: 'No run yet. Logs will appear here.' }]).map((line, index) => (
              <p key={`${line.text}-${index}`} className={`log-${line.level}`}>
                <span>{line.level}</span>{line.text}
              </p>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Git diff preview</h2>
          <pre className="diff-panel">{run?.diff || 'No diff yet. Run Smallcode or refresh after making changes.'}</pre>
        </div>
      </section>
    </main>
  );
}

export default App;
