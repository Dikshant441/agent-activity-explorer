const { pageSize, tickerIntervalMs, tickerVisibleRows, storageKey } = window.APP_CONFIG;

const grid = document.getElementById('agents');
const searchInput = document.getElementById('search');
const resultsList = document.getElementById('results');
const resultsCount = document.getElementById('results-count');
const topbar = document.querySelector('.topbar');
const backToTop = document.getElementById('back-to-top');
const progress = document.getElementById('read-progress');
const tickerToggle = document.getElementById('ticker-toggle');
const preview = document.getElementById('row-preview');
const scrollContext = document.getElementById('scroll-context');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' });
}

function countByAgent(events) {
  const counts = {};
  events.forEach((event) => {
    counts[event.agent] = (counts[event.agent] || 0) + 1;
  });
  return counts;
}

function renderAgents() {
  const counts = countByAgent(window.ACTIVITY);
  grid.innerHTML = window.AGENTS.map((agent, index) => {
    const image = 'assets/agents/agent-' + String((index % 12) + 1).padStart(2, '0') + '.webp';
    return (
      '<article class="agent-card">' +
      '<img class="agent-avatar" src="' + image + '" width="48" height="48" loading="lazy" decoding="async" alt="">' +
      '<h3>' + escapeHtml(agent.name) + '</h3>' +
      '<p class="agent-owner">' + escapeHtml(agent.owner) + '</p>' +
      '<p class="agent-description">' + escapeHtml(agent.description) + '</p>' +
      '<p class="agent-count">' + (counts[agent.name] || 0).toLocaleString() + ' calls today</p>' +
      '</article>'
    );
  }).join('');
}

// Ids of rows already seen, loaded once and kept in memory
const viewedIds = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));

function rememberViewed(items) {
  const countBefore = viewedIds.size;
  for (const item of items) viewedIds.add(item.id);
  // One write, and only when something new was seen
  if (viewedIds.size > countBefore) {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(viewedIds)));
  }
}

// Newest first, sorted once. ISO timestamps sort correctly as plain strings.
const sortedActivity = window.ACTIVITY.slice().sort((a, b) =>
  a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
);

// Lowercase search text per event, built on first use and reused after that
const searchTexts = new Array(sortedActivity.length);

function searchText(index) {
  if (searchTexts[index] === undefined) {
    searchTexts[index] = JSON.stringify(sortedActivity[index]).toLowerCase();
  }
  return searchTexts[index];
}

// Fill the search text in small chunks while the browser is idle,
// so the first search does not pay for all of it at once
let indexedCount = 0;

function buildSearchIndex(deadline) {
  while (indexedCount < sortedActivity.length && deadline.timeRemaining() > 1) {
    searchText(indexedCount++);
  }
  if (indexedCount < sortedActivity.length) requestIdleCallback(buildSearchIndex);
}

if ('requestIdleCallback' in window) requestIdleCallback(buildSearchIndex);

function search(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return sortedActivity;
  return sortedActivity.filter((event, index) => searchText(index).includes(needle));
}

function renderResults(query) {
  const matches = search(query);
  const page = matches.slice(0, pageSize);
  resultsCount.textContent = matches.length.toLocaleString() + ' matching tool calls';
  resultsList.innerHTML = page.map((event) => {
    const isNew = !viewedIds.has(event.id);
    return (
      '<li class="result-row status-' + event.status + '" data-id="' + event.id + '" data-minute="' + event.timestamp.slice(11, 16) + '">' +
      '<span class="result-time">' + formatTime(event.timestamp) + '</span>' +
      '<span class="result-agent">' + escapeHtml(event.agent) + '</span>' +
      '<span class="result-tool">' + escapeHtml(event.tool) + '</span>' +
      '<span class="result-status">' + event.status + '</span>' +
      '<span class="result-latency">' + event.latencyMs + ' ms</span>' +
      '<span class="result-summary">' + escapeHtml(event.summary) + '</span>' +
      (isNew ? '<span class="badge-new">New</span>' : '') +
      '</li>'
    );
  }).join('');
  fitSummaries();
  rememberViewed(page);
}

function fitSummaries() {
  const cells = Array.from(resultsList.querySelectorAll('.result-summary'));
  const maxSize = 14;
  const minSize = 11;

  // Write: start every cell at the largest size
  cells.forEach((cell) => {
    cell.style.fontSize = maxSize + 'px';
  });

  // Read: measure every cell in one layout pass.
  // Text width scales with font size, so the size that fits can be calculated.
  const sizes = cells.map((cell) => {
    const fitting = Math.floor((maxSize * cell.clientWidth * 2) / cell.scrollWidth) / 2;
    return Math.max(minSize, Math.min(maxSize, fitting));
  });

  // Write: apply the sizes
  cells.forEach((cell, index) => {
    cell.style.fontSize = sizes[index] + 'px';
  });
}

// Calls per minute (HH:MM, UTC), counted once instead of on every scroll
const callsPerMinute = new Map();
for (const event of window.ACTIVITY) {
  const minute = event.timestamp.slice(11, 16);
  callsPerMinute.set(minute, (callsPerMinute.get(minute) || 0) + 1);
}

function onScroll() {
  // Read everything first, so the browser lays out the page once
  const scrolled = window.scrollY;
  const viewport = window.innerHeight;
  const max = document.documentElement.scrollHeight - viewport;
  const rows = Array.from(resultsList.querySelectorAll('.result-row'));
  const inFocus = rows.map((row) => {
    const top = row.getBoundingClientRect().top;
    return top > viewport * 0.3 && top < viewport * 0.6;
  });

  // Then write
  progress.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + '%';
  topbar.classList.toggle('topbar-raised', scrolled > 8);
  topbar.style.paddingBlock = Math.max(6, 12 - scrolled / 20) + 'px';
  backToTop.classList.toggle('visible', scrolled > viewport);
  rows.forEach((row, index) => row.classList.toggle('in-focus', inFocus[index]));

  const focused = rows[inFocus.indexOf(true)];
  if (focused) {
    const minute = focused.dataset.minute;
    scrollContext.textContent = minute + ' UTC · ' + (callsPerMinute.get(minute) || 0) + ' calls that minute';
  } else {
    scrollContext.textContent = '';
  }
}

function hidePreview() {
  preview.hidden = true;
}

let previewRow = null;

function showPreview(event) {
  const row = event.target.closest('.result-row');
  if (!row) return;
  // The summary is already in the row, so there is nothing to search for
  if (row !== previewRow) {
    previewRow = row;
    preview.textContent = row.querySelector('.result-summary').textContent;
  }
  preview.style.top = event.clientY + 12 + 'px';
  preview.style.left = event.clientX + 12 + 'px';
  preview.hidden = false;
}

let tickerPanel = null;
let tickerTimer = null;

function tickerRow(event) {
  const row = document.createElement('li');
  row.className = 'ticker-row status-' + event.status;
  row.innerHTML =
    '<span class="ticker-time">' + formatTime(event.timestamp) + '</span>' +
    '<span class="ticker-agent">' + escapeHtml(event.agent) + '</span>' +
    '<span class="ticker-tool">' + escapeHtml(event.tool) + '</span>';
  return row;
}

function positionTicker() {
  if (!tickerPanel) return;
  tickerPanel.style.maxHeight = window.innerHeight - 120 + 'px';
}

function onTickerKeydown(event) {
  if (event.key === 'Escape') closeTicker();
}

function openTicker() {
  const panel = document.createElement('aside');
  panel.className = 'ticker';
  panel.innerHTML = '<header class="ticker-header">Live tool calls</header><ul class="ticker-list"></ul>';
  document.body.appendChild(panel);
  tickerPanel = panel;
  const list = panel.querySelector('.ticker-list');

  tickerTimer = setInterval(() => {
    const event = window.ACTIVITY[Math.floor(Math.random() * window.ACTIVITY.length)];
    list.prepend(tickerRow(event));
    while (list.children.length > tickerVisibleRows) {
      list.lastElementChild.remove();
    }
  }, tickerIntervalMs);

  window.addEventListener('resize', positionTicker);
  window.addEventListener('keydown', onTickerKeydown);
  positionTicker();
  tickerToggle.setAttribute('aria-pressed', 'true');
  tickerToggle.textContent = 'Hide live calls';
}

// Stop everything the ticker started: its timer and both listeners
function closeTicker() {
  if (!tickerPanel) return;
  clearInterval(tickerTimer);
  window.removeEventListener('resize', positionTicker);
  window.removeEventListener('keydown', onTickerKeydown);
  tickerPanel.remove();
  tickerPanel = null;
  tickerToggle.setAttribute('aria-pressed', 'false');
  tickerToggle.textContent = 'Show live calls';
}

// Wait until typing pauses before searching
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderResults(searchInput.value), 150);
});
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', fitSummaries);
resultsList.addEventListener('mousemove', showPreview);
resultsList.addEventListener('mouseleave', hidePreview);
resultsList.addEventListener('wheel', hidePreview, { passive: true });
resultsList.addEventListener('touchstart', hidePreview, { passive: true });
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
tickerToggle.addEventListener('click', () => (tickerPanel ? closeTicker() : openTicker()));

renderAgents();
renderResults('');
