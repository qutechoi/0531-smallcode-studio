# Smallcode Studio

A review-first local web console for running [Smallcode](https://github.com/Doorman11991/smallcode) against a local repository.

Smallcode Studio keeps the agent in the terminal layer and gives you a browser UI for the safe parts of the workflow: choosing a repo, sending a focused task prompt, reading logs, and reviewing `git diff` before keeping any AI-generated patch.

## MVP features

- Local-first React/Vite dashboard
- Repository path and task prompt form
- Smallcode availability and Git status inspection
- Safe server-side command runner using `spawn(..., { shell: false })`
- Smallcode run endpoint with argument validation
- Diff and diff-stat preview after each run
- Unit/component tests for guardrails and UI behavior

## Safety model

The browser never gets arbitrary shell access. The local Node server exposes only three whitelisted API routes:

- `POST /api/inspect` — checks repo status and Smallcode availability
- `POST /api/run` — runs `smallcode --cwd <repoPath> <prompt>`
- `POST /api/diff` — reads `git diff` and `git diff --stat`

Repository paths reject shell metacharacters, commands are spawned without a shell, and the UI is designed around diff review rather than blind application.

## Requirements

- Node.js 22+
- npm
- Git
- Smallcode CLI installed and available as `smallcode` on your `PATH`

## Development

```bash
npm install
npm run dev
```

The Vite dev server serves the UI. API routes are available from the production-style local server below.

## Run the local studio server

```bash
npm run serve
```

Then open http://localhost:4173.

## Verify

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## Roadmap

- Stream logs over Server-Sent Events instead of returning them after process exit
- Add explicit discard/revert buttons backed by `git checkout -- <file>`
- Save run history to SQLite
- Support multiple coding agents behind the same review UI
- Add benchmark mode for small coding models
