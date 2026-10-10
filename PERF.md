# PERF: Perf Clinic fixes

Entries are ordered by impact on the user, highest first. Each fix is its own commit.

Numbers come from Chrome on my machine, timing the page's own functions with `performance.now()` in the DevTools console. They show the size of each change, not exact values for other machines.

### 1. Search freezes the page on every keystroke
- **Symptom:** typing in the search box locks the page. Letters appear late, and nothing scrolls or responds until the search finishes. The first paint is also delayed, because the same search runs once at startup.
- **How I found it:** DevTools console. I timed `search()` and then dispatched seven `input` events to type "billing" through the real handler. _(Add your own Performance panel observation here.)_
- **Root cause:** each keystroke ran a full search over all 100,000 events, and the search did three expensive things every time:
  - It called `JSON.stringify` and `toLowerCase` on every event.
  - It re-sorted the matches, creating two `Date` objects per comparison.
  - It ran immediately for every letter, with no debounce.
- **Fix:**
  - Sort the events once at startup, comparing the ISO timestamp strings directly.
  - Cache each event's lowercase search text, filled in idle time with `requestIdleCallback`.
  - Return the sorted list directly for an empty query.
  - Debounce the input by 150 ms.
  - The results are identical to the old search. I compared both for several queries.
- **Before / after:**

| Measurement | Before | After |
|---|---|---|
| One search with a query ("billing") | 441 ms | 36 ms |
| One search with an empty query | 4,756 ms | under 1 ms |
| Main thread blocked while typing "billing" (7 letters) | 11,652 ms | 0.4 ms in the handlers, then one search |
| Renders while typing "billing" | 7 | 1 |
| DOMContentLoaded | 6,066 ms | 1,916 ms |

### 2. Fitting the summary text forces layout hundreds of times
- **Symptom:** every search result render stalls for most of a second before the list appears. Resizing the window stutters for the same reason.
- **How I found it:** DevTools console. I timed `fitSummaries()` on its own and inside `renderResults()`. _(Add your own Performance panel observation here.)_
- **Root cause:** layout thrashing. For each of the 200 rows the code set a font size (a write), then read `scrollWidth` (which forces the browser to lay out the page again), and repeated that up to seven times per row while shrinking the font by 0.5 px. That is up to 1,400 forced layouts per render.
- **Fix:** batch the writes and the reads, so there are two layouts in total:
  - Set every cell to the largest size.
  - Read every cell's width in one pass and calculate the size that fits. Text width scales with font size, so no trial and error is needed.
  - Apply the sizes.
  - All 200 cells get exactly the same font size as before.
- **Before / after:**

| Measurement | Before | After |
|---|---|---|
| `fitSummaries()` for 200 rows | 749 ms | 10 ms |
| `renderResults()` in total | 776 ms | 142 ms |
| DOMContentLoaded | 1,916 ms | 1,451 ms |

### 3. Scrolling the results list is janky
- **Symptom:** scrolling through the tool-call list stutters and lags behind the mouse wheel or trackpad. The top of the page scrolls smoothly, and the lag starts once the list is on screen.
- **How I found it:** DevTools console. I timed `onScroll()` at six scroll positions. It was fast (about 2 ms) until a result row was in the highlighted band, then slow every time. _(Add your own Performance panel observation here.)_
- **Root cause:** the scroll handler did far too much work for every scroll event:
  - To show "N calls that minute", it filtered all 100,000 events and created a `Date` for each one, on every scroll event.
  - For each of the 200 rows it removed a class (a write) and then called `getBoundingClientRect` (a read), which forces a new layout for every row.
  - The `wheel` and `touchstart` listeners on the list were not passive, so the browser had to wait for them before it could scroll.
- **Fix:**
  - Count the calls per minute once at startup, in a `Map`. The scroll handler now does a lookup.
  - Read all row positions first, then apply the class changes, so the page is laid out once per scroll event.
  - Mark the `scroll`, `wheel` and `touchstart` listeners as passive.
  - The highlighted rows, the "calls that minute" text and the progress bar are identical to before at all six positions I compared.
- **Before / after:**

| Measurement | Before | After |
|---|---|---|
| `onScroll()` with a row highlighted | 335 to 395 ms | about 1.1 ms |
| `onScroll()` with no row highlighted | 1.8 ms | about 1 ms |

A frame at 60 fps has 16.7 ms, so the old handler took about 20 frames' worth of time per scroll event.
