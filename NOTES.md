# NOTES

## What I built
Part A: Agent Activity Explorer (`app/`). Part B: Perf Clinic fixes (`perf-clinic/`, see PERF.md).
_Work in progress. This file is updated with each commit._

## Stack choices
- **Vite + React + TypeScript:** fast dev server. A SPA fits one page whose state lives in the URL, so no server rendering is needed.
- **TanStack Query:** caching, request cancellation and cursor-based infinite paging come built in, instead of hand-written and hand-tested. Cost: one more dependency.
- **Tailwind CSS (v4):** consistent styling quickly, and `dark:` follows the system setting. Cost: longer class strings in markup.

## Tradeoffs
_TBD_

## Known broken or incomplete
_TBD_

## How I used AI tools
I used Claude Code (in VS Code) as a pair programmer. I directed each step, reviewed the output and made every git commit myself.
