# Agent Activity Explorer

A frontend take-home assignment in two parts:

- **Part A (`app/`):** a React app for browsing AI agent tool-call events, with search, filters, a detail panel and clear loading, empty, error and slow-network states.
- **Part B (`perf-clinic/`):** a plain HTML, CSS and JavaScript page that was slow on purpose. Thirteen performance problems are diagnosed, fixed and measured.

The brief is in [ASSIGNMENT.md](ASSIGNMENT.md). Decisions, tradeoffs and AI usage are in [NOTES.md](NOTES.md). The Part B write-up is in [PERF.md](PERF.md).

## What is in each part

**Part A: Agent Activity Explorer**

- **Event table:** time, agent, tool call, status and latency, with cursor paging through all 50,000 events (infinite scroll, plus a "Load more" button).
- **Search and filters:** free-text search, a multi-select agent filter and a status filter. All of it is stored in the URL, so refresh, back and forward, and copied links restore the same view.
- **Detail panel:** opens from `?event=<id>`, shows the full event, and closes with `Esc`.
- **States:** loading skeletons, an empty state, errors with "Try again" and a slow-network hint, for the table, the panel and the agent list.
- **Extras:** unit tests, dark mode from the system setting and reduced-motion support.

**Part B: Perf Clinic**

Each problem has an entry in [PERF.md](PERF.md) with the symptom, root cause, fix and numbers. The fixes are in the seven `perf:` commits. The largest changes:

| Area | Before | After |
|---|---|---|
| Typing "billing" in search | page blocked for 11.7 s | one 36 ms search |
| Scroll handler, per scroll event | 335 to 395 ms | 1 to 3 ms |
| Fitting summary text, per render | 749 ms | 10 ms |
| Page download | 6,470 KB | 820 KB |
| Render-blocking CSS | 326 KB | 6 KB |
| HTML fully parsed | 1,041 ms | 41 ms |
| Timers left running after closing the ticker 5 times | 5 | 0 |

These were measured in Chrome on one machine, by timing the page's functions and reading the browser's own timings.

## Requirements

- **Node.js 22.12 or newer** (Node 24 also works)
- **npm** (comes with Node)
- **git**

## Run it locally

Clone the repo with git. A zip download can make macOS block the mock API binary.

```bash
git clone https://github.com/Dikshant441/agent-activity-explorer.git
cd agent-activity-explorer
```

You need two terminals for Part A: one for the mock API and one for the app.

**Terminal 1: mock API** (from the repo root)

```bash
npm install
npm run api
```

The API runs on `http://localhost:4000`. Leave it running.

**Terminal 2: the app** (from `app/`)

```bash
cd app
npm install
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

**Part B: Perf Clinic** (from the repo root, optional third terminal)

```bash
npm run perf-clinic
```

Open `http://localhost:5174`. Part B does not need the mock API.

### API URL (optional)

The app calls `http://localhost:4000` by default, so no setup is needed. To point it at another address, copy the example file and edit it, then restart `npm run dev`:

```bash
cd app
cp .env.example .env
```

## Test it

All commands run from `app/`.

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests (retry logic and URL state) |
| `npm run lint` | Runs the linter |
| `npm run build` | Type-checks and builds for production |
| `npm run preview` | Serves the production build locally |

### Things to try in the browser

1. **Paging:** scroll to the bottom of the table. More events load, and "Load more" works as a fallback.
2. **Search and filters:** type in the search box, pick agents and pick a status. The URL updates each time.
3. **Shareable URL:** refresh the page, use back and forward, or paste the URL into a new tab. The same view opens.
4. **Detail panel:** click a row. The URL gets `event=<id>`. Press `Esc` to close it.
5. **Empty state:** search for something that does not exist, such as `zzzz`.
6. **Error state:** stop the mock API (`Ctrl+C` in terminal 1) and change a filter. An error with "Try again" appears. Start the API again and retry.
7. **Slow network:** in DevTools, open Network and set throttling to "Slow 4G". A "taking longer than usual" hint appears after 2 seconds.
8. **Dark mode:** switch your system theme. The app follows it.

The mock API is slow and fails on purpose (roughly one request in four returns a 500). The app retries those automatically, so an occasional short delay is expected.

### Things to try in Part B

Open `http://localhost:5174` with DevTools open.

1. **Search:** type quickly in the search box. The page stays responsive and the list updates once you pause.
2. **Scroll:** scroll through "Recent tool calls". The highlighted rows and the "calls that minute" text in the top bar follow without stutter.
3. **Network panel:** reload and check the transfer size and the image formats (WebP, with avatars loading as they scroll into view).
4. **Live ticker:** click "Show live calls", then close it. No rows are created after it closes.
5. **Compare with the original:** check out the commit before the first `perf:` commit to see the slow version.

   ```bash
   git log --oneline --grep="^perf"
   ```

## Tech stack

| Area | Tool |
|---|---|
| Framework | React 19 |
| Language | TypeScript (strict) |
| Build tool | Vite |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS 4 |
| Tests | Vitest |
| Linting | Oxlint |
| Part B | Plain HTML, CSS and JavaScript |

## Project structure

| Path | What it is |
|---|---|
| `app/` | Part A: the React app |
| `app/src/api/` | API client (fetch, retry, cancel), endpoint functions and types |
| `app/src/hooks/` | URL state, data queries and the slow-loading hook |
| `app/src/components/` | Event table, filters, detail panel and shared state views |
| `perf-clinic/` | Part B: the page, with the performance fixes applied |
| `bin/` | Prebuilt mock API binaries. `npm run api` picks the right one |
| `scripts/` | Launchers for `npm run api` and `npm run perf-clinic` |
| `ASSIGNMENT.md` | The brief and API reference |
| `NOTES.md` | What was built, tradeoffs, known gaps and AI usage |
| `PERF.md` | Part B: one entry per problem, with before and after numbers |

## Troubleshooting

- **"Could not reach the server" in the app:** the mock API is not running. Start it with `npm run api` from the repo root.
- **Port already in use:** Vite picks the next free port and prints it. Use that URL.
- **macOS blocks the API binary:** run `xattr -d com.apple.quarantine bin/*` from the repo root.
- **`.env` change has no effect:** restart `npm run dev`. Vite reads `.env` only at startup.
