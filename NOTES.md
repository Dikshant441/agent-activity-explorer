# NOTES

## What I built
**Part A (`app/`), all four Core items:**
1. **Event list:** table with timestamp, agent, tool, status and latency. Cursor paging through the whole dataset with infinite scroll, plus a "Load more" button as a fallback.
2. **Search and filters:** free-text search (debounced 300 ms), multi-select agent filter and status filter. All of it lives in the URL, so refresh, back/forward and copied links restore the same view.
3. **Detail panel:** opens from `?event=<id>`, so it is linkable. Esc or the Close button closes it, and focus returns to the row it was opened from.
4. **States:** skeleton loading, empty (with "clear filters"), error with "Try again", and a "taking longer than usual" hint after 2 s. The table, the panel and the agent list each handle their own states.

**Optional items I picked:**
- **Tests (Stretch):** the URL parsing and the retry logic are the parts most likely to break silently, so they have unit tests (`npm test` in `app/`, 9 tests).
- **Design:** a warm "audit ledger" theme (paper and ink colors, monospace for data) instead of a default look. Each row also shows the args preview and a small latency bar, and "ok" is styled quietly so blocked and error events stand out when scanning.
- **Polish that came cheap:** dark mode from the system setting (CSS variables), `prefers-reduced-motion` respected on skeletons, semantic table markup, real links on rows (ctrl-click opens a new tab), visible focus rings, labelled controls.

**Part B (`perf-clinic/`):** thirteen performance problems found, fixed and measured. Each has an entry in PERF.md with before and after numbers.

## Stack choices
- **Vite + React + TypeScript:** a SPA fits one page whose state lives in the URL. No server rendering is needed.
- **TanStack Query:** caching, cancelling stale requests and cursor paging come built in. Cost: one more dependency.
- **Tailwind CSS v4:** fast, consistent styling. Cost: long class strings in markup.
- **No router library:** the URL state is one small hook over `URLSearchParams` and `history`, which was less code than adding a router for a single page.

## Tradeoffs
- **Retries live in the API client, not React Query.** The mock API returns a 500 on roughly a quarter of calls. The client retries 5xx and network errors twice (400 ms, then 800 ms) and never retries 4xx or cancelled requests. A failing request therefore takes longer before the error shows.
- **Every settled search adds a history entry.** Back undoes one search at a time, at the cost of a longer history.
- **The list is not virtualized.** Rows stay in the DOM as you scroll, which is fine for a few thousand rows but would get slow far into the 50k dataset. A hand-built virtual list is the first thing I would add.
- **The detail panel is not modal.** The list stays usable while it is open, so focus is not trapped inside it.
- **Large `args` are cut at 5,000 characters** with a "Show all" button, to keep the panel responsive.

## With more time
Virtualized list, arrow-key row navigation, the histogram chart, component tests for the states, and live mode.

## Known broken or incomplete
- Polish is partial: no arrow-key navigation through rows, and I have not tested with a screen reader.
- On narrow screens the panel covers the list instead of sitting beside it.
- Part B: the scripts still do about one second of work on the main thread after the page is parsed. Moving the data generation to a Web Worker would remove it.
- Part B numbers come from timing functions and reading browser timings in the console. I did not capture first paint or layout shift figures.

## How I used AI tools
I used **Claude Code** (in VS Code) for both parts, and its **Claude in Chrome** extension to run and check the work in a real browser. I set the scope and order of work, reviewed each change and made every git commit myself.

| Area | What I used AI for | What I did |
|---|---|---|
| Planning | Reading the brief and breaking it into ordered steps | Chose the stack and what to leave out (Core first, one Stretch item) |
| Code (Part A) | Writing the API client, hooks, components and unit tests | Asked for simpler versions with fewer types and helpers, and reviewed each file before committing |
| Error handling | The retry rules (5xx and network errors only, never 4xx or cancelled requests) and the loading, empty, error and slow states | Decided where retries live and which states each view needs |
| Debugging | Driving the app through the Chrome extension: deep links, back and forward, Esc, infinite scroll, and simulated 500s, offline and slow responses. This found a bug where a retry kept showing the old error | Reviewed the fix |
| Performance (Part B) | Finding the problems by reading the code, timing each one in the browser, writing the fixes and checking that the output stayed identical | Chose the order, reviewed each fix and its numbers |
| UI | Restyling the app after I asked for a more distinctive look than the first version | Picked the direction |
| Docs | Drafting README.md, PERF.md and this file | Edited them |

AI wrote most of the code. The measurements in PERF.md were taken by the AI through the browser, not by me in the DevTools panels.
