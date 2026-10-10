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

### 4. The page downloads 6.5 MB, most of it oversized images
- **Symptom:** on a normal connection the hero image appears late and paints in from the top. The page also jumps as images arrive, because nothing reserves their space.
- **How I found it:** the browser's resource timings (the same data as the DevTools Network panel), read with `performance.getEntriesByType('resource')`, plus the `naturalWidth` and `clientWidth` of each image. _(Add your own Network panel observation here.)_
- **Root cause:**
  - The hero was a 4.2 MB PNG. PNG is a poor format for a photographic, noisy gradient.
  - The 12 avatars were 320×320 PNGs of about 160 KB each, displayed at 48×48. That is 44 times more pixels than needed.
  - No image had `width` and `height`, so the browser could not reserve space before the files arrived.
  - All avatars loaded up front, although they sit below the first screen.
- **Fix:**
  - Hero: re-encoded as WebP at the same 1700×950 size, plus a 960 px version chosen through `srcset` and `sizes` on smaller screens. It has `fetchpriority="high"`, since it is the largest element on first view.
  - Avatars: resized to 96×96 WebP (2× the displayed size, for high-density screens), with `loading="lazy"` and `decoding="async"`.
  - Every image now has `width` and `height`, so its space is reserved.
  - I converted the images with Chrome's built-in WebP encoder (canvas `toBlob`, quality 0.8 for the hero and 0.85 for avatars) and removed the PNG files.
- **Before / after:**

| Measurement | Before | After |
|---|---|---|
| Hero image | 4,171 KB | 401 KB (62 KB for the 960 px version) |
| All avatars | 1,896 KB | 14 KB |
| Total page transfer | 6,470 KB | 820 KB |
| Requests on first load, before scrolling | 19 | 6 |

### 5. A 320 KB stylesheet blocks rendering and none of it is used
- **Symptom:** the first paint waits for a large stylesheet to download and be parsed. The delay grows on a slow connection.
- **How I found it:** resource timings showed `theme.css` at 320 KB with `renderBlockingStatus: "blocking"`. I then checked every rule in it against the page with `document.querySelector`. _(Add your own Coverage or Network panel observation here.)_
- **Root cause:** `theme.css` is a utility-class library (classes such as `.m-0` and `.mt-4`). The page never uses any of those classes: 0 of its 1,432 rules matched an element, and none of the class names appear in `index.html` or `app.js`. All real styling lives in `app.css`. A stylesheet in the `<head>` blocks the first paint until it is loaded, so this was pure cost.
- **Fix:** removed the `<link>` and deleted the file. The page looks the same, since nothing referenced it.
- **Before / after:**

| Measurement | Before | After |
|---|---|---|
| Render-blocking CSS | 326 KB (`theme.css` + `app.css`) | 6 KB (`app.css`) |
| Rules in `theme.css` that match the page | 0 of 1,432 | file removed |

### 6. Scripts block the HTML parser before anything can paint
- **Symptom:** nothing can appear until the scripts have finished, about a second on every load, even with everything cached.
- **How I found it:** navigation timing. `domInteractive` (the moment the HTML is fully parsed) was almost identical to `DOMContentLoaded`, which means the parser was stuck waiting on scripts. Resource timings also marked `config.js` as render-blocking. _(Add your own Performance panel observation here.)_
- **Root cause:** `config.js` was a plain `<script>` in the `<head>`. It builds 100,000 events in a loop, and the browser cannot parse or paint any of the page below it until that finishes. `app.js` at the end of the body then blocked again while it sorted and rendered.
- **Fix:** both scripts now load with `defer`. The browser parses the whole document first and can paint the header, hero and layout, then runs the scripts in order. No JavaScript changed.
- **Before / after** (median of 5 loads):

| Measurement | Before | After |
|---|---|---|
| HTML fully parsed (`domInteractive`) | 1,041 ms | 41 ms |
| Render-blocking scripts | 1 (`config.js`) | 0 |
| `DOMContentLoaded` | 1,041 ms | 1,048 ms |

`DOMContentLoaded` did not change, and that is expected: the scripts still do about one second of work, but it now happens after the page has been parsed instead of before. Generating the data in a Web Worker would remove that remaining second from the main thread.

### 7. The live ticker keeps running after it is closed
- **Symptom:** closing "Show live calls" hides the panel but its work continues in the background, and every reopen adds another copy of that work. The page does more and holds more memory the longer it stays open, with nothing visible to explain it.
- **How I found it:** I wrapped `setInterval`, `clearInterval`, `addEventListener` and `removeEventListener` in the DevTools console, then opened and closed the ticker five times and counted the calls. I also watched the row cache grow after the panel was closed. _(Add your own Memory panel observation here.)_
- **Root cause:** three leaks in the ticker code:
  - `closeTicker` removed the panel from the page but never stopped its `setInterval`. The timer kept creating rows for a detached list.
  - Every open added a new `resize` and `keydown` listener, and none was ever removed.
  - Every row was stored in a `Map` keyed by event id, which only grew. The cache had no benefit, because each row was cloned on use anyway.
  - Each reopen stacked another timer on top, so the cost grew with every cycle.
- **Fix:**
  - `closeTicker` now calls `clearInterval` and removes both listeners.
  - The `keydown` handler is a named function, so it can be removed.
  - The row cache is gone. Each row is created once and removed when it scrolls off.
- **Before / after** (5 open and close cycles):

| Measurement | Before | After |
|---|---|---|
| Timers still running | 5 | 0 |
| Listeners left on `window` | 10 | 0 |
| DOM changes in 2.5 s after closing | continues (row cache grew from 3 to 6) | 0 |

### 8. The hover preview searches 100,000 events on every mouse move
- **Symptom:** moving the mouse across the results list feels sticky, and the small preview box trails behind the cursor.
- **How I found it:** DevTools console. I timed `showPreview()` with a row as the target. _(Add your own Performance panel observation here.)_
- **Root cause:** `mousemove` fires many times per second. On each one the handler called `window.ACTIVITY.find(...)` to look up the event by id, scanning up to 100,000 objects, only to read a summary that is already rendered inside the row.
- **Fix:** read the summary from the row's own `.result-summary` cell, and only when the cursor moves to a different row. The preview text and position are unchanged.
- **Before / after:**

| Measurement | Before | After |
|---|---|---|
| `showPreview()` per mouse move | 23.8 ms | under 0.01 ms |

### 9. `localStorage` is written once per row on every render
- **Symptom:** every render of the results list does avoidable synchronous work, which adds to the delay after each search.
- **How I found it:** I wrapped `Storage.prototype.setItem` and `getItem` in the DevTools console and counted the calls made by one `renderResults()`.
- **Root cause:** `rememberViewed` called `localStorage.setItem` inside its loop, so one render serialized and wrote the whole list 200 times. It did this even when nothing new had been seen. `localStorage` is synchronous, so each write blocks the main thread. The list was also re-read and re-parsed twice per render, and checked with `Array.includes`, which rescans it for every row.
- **Fix:** keep the viewed ids in a `Set` loaded once at startup. A render adds its ids to the set and writes to `localStorage` once, and only if something new was added. The "New" badges behave as before.
- **Before / after** (one render of 200 rows):

| Measurement | Before | After |
|---|---|---|
| `setItem` calls, first render | 200 | 1 |
| `setItem` calls, nothing new to store | 200 | 0 |
| `getItem` calls | 2 | 0 |
| `renderResults()` | 128 to 164 ms | 99 to 103 ms |

### 10. Card heights are equalized in JavaScript
- **Symptom:** extra layout work on load and on every window resize. With images loading late, the cards could also be seen changing height.
- **How I found it:** reading `equalizeCardHeights()` and timing it in the DevTools console.
- **Root cause:** to make cards in the same row equal height, the script compared every card with every other card (24 × 24), reading `offsetTop` and `offsetHeight` right after clearing a style, which forces layout repeatedly. It ran at startup, again on each avatar `load` event and again on every `resize` event.
- **Fix:** let CSS do it. Grid items stretch to the height of their row by default, so removing `align-items: start` gives equal heights with no script. The 220 px floor moved to `min-height` on the card. The function, the image `load` listeners and the `resize` listener are deleted.
- **Before / after:**

| Measurement | Before | After |
|---|---|---|
| `equalizeCardHeights()` per call | 10.5 ms | removed |
| Calls on load | 1 + one per avatar image | 0 |
| Calls per resize event | 1 | 0 |

Card heights are within 1 px of the old ones (266 and 245 px, against 267 and 246 px). I believe the difference is rounding: the script set whole-pixel heights, and CSS keeps the fractional ones.
