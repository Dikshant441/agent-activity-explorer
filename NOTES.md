# NOTES

## What I built
**Part A (`app/`), all four Core items:**
1. **Event list:** a table with time, agent, tool, status and latency. Cursor paging reaches the whole dataset through infinite scroll, with a "Load more" button as a fallback.
2. **Search and filters:** debounced free-text search, a multi-select agent filter and a status filter. All of it lives in the URL, so refresh, back and forward, and copied links restore the same view.
3. **Detail panel:** opens from `?event=<id>`, so it is linkable. Esc or the Close button closes it, and focus returns to the row.
4. **States:** skeleton loading, empty (with "clear filters"), error with "Try again", and a "taking longer than usual" hint after 2 s. The table, the panel and the agent list each handle their own.

**Optional items, and why:**
- **Tests (Stretch):** URL parsing and the retry logic are the parts most likely to break silently, so they have unit tests (`npm test` in `app/`).
- **Polish that came cheap:** dark mode from the system setting, `prefers-reduced-motion` on skeletons, semantic table markup, real links on rows, visible focus rings and labelled controls.

**Part B (`perf-clinic/`):** thirteen performance problems found, fixed and measured. See PERF.md.

## Stack choices
- **Vite + React + TypeScript:** a SPA fits one page whose state lives in the URL. No server rendering is needed.
- **TanStack Query:** caching, cancelling stale requests and cursor paging come built in.
- **Tailwind CSS v4:** fast, consistent styling, at the cost of long class strings.
- **No router library:** the URL state is one small hook over `URLSearchParams` and `history`.

## Tradeoffs
- **Retries live in the API client.** The mock API fails on roughly a quarter of calls. The client retries 5xx and network errors twice and never retries 4xx or cancelled requests, so a real failure takes longer to show.
- **Every settled search adds a history entry.** Back undoes one search at a time, at the cost of a longer history.
- **The list is not virtualized.** That is fine for a few thousand rows, but it would get slow far into the 50k dataset.
- **The detail panel is not modal.** The list stays usable while it is open, so focus is not trapped.
- **Large `args` are cut at 5,000 characters** with a "Show all" button.

## With more time
A hand-built virtualized list first, then arrow-key row navigation, the histogram chart, component tests for the states and live mode.

## Known broken or incomplete
- No arrow-key navigation through rows, and I have not tested with a screen reader or at tablet width.
- On narrow screens the panel covers the list instead of sitting beside it.
- Part B: the scripts still do about one second of work after the page is parsed. A Web Worker would remove it.
- Part B numbers come from console timings. I did not capture first paint or layout shift scores.

## How I used AI tools
I used **Claude Code** (in VS Code) for both parts, with its **Claude in Chrome** extension to run and check the work in a real browser. AI wrote most of the code. I set the scope and order of work, reviewed each change and made every commit myself.

- **Planning:** AI broke the brief into ordered steps. I chose the stack and what to leave out.
- **Part A code:** AI wrote the API client, hooks, components and tests. I asked for simpler versions with fewer types and helpers.
- **Error handling:** AI proposed the retry rules and the four states. I decided where retries live.
- **Debugging:** AI drove the app through the Chrome extension (deep links, back and forward, Esc, infinite scroll, simulated 500s, offline and slow responses). This found a bug where a retry kept showing the old error.
- **Part B:** AI found the problems by reading the code, timed each one in the browser, wrote the fixes and checked that the output stayed identical. The measurements in PERF.md were taken this way, not by me in the DevTools panels.
- **UI and docs:** AI restyled the app when I asked for a more distinctive look, and drafted README.md, PERF.md and this file.
