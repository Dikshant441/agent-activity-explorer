import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import type { EventFilters } from '../api/types'
import { useEvents } from '../hooks/useEventQueries'
import { useIsSlow } from '../hooks/useIsSlow'
import { EmptyState, ErrorState, Skeleton, SlowHint } from './States'
import { StatusBadge } from './StatusBadge'

const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' })
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

// A latency bar is full at this value
const LATENCY_BAR_MAX_MS = 500

const CELL = 'px-4 py-2.5 align-top'
const HEAD = 'px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest'

interface Props {
  filters: EventFilters
  selectedId: string
  eventHref: (id: string) => string
  onSelect: (id: string) => void
  // Only passed when a search or filter is active
  onClearFilters?: () => void
}

export function EventTable({ filters, selectedId, eventHref, onSelect, onClearFilters }: Props) {
  const query = useEvents(filters)
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query
  const slow = useIsSlow(query.isFetching)

  const events = query.data?.pages.flatMap((page) => page.items) ?? []
  const total = query.data?.pages[0].total ?? 0
  // First load, or a retry after a failed first load
  const loading = query.isFetching && !query.data

  // Infinite scroll: load the next page when the end of the list comes into view
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const end = endRef.current
    if (!end || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchNextPage()
      },
      { rootMargin: '400px' },
    )
    observer.observe(end)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  // Let ctrl/cmd/shift click open the link in a new tab
  function handleLinkClick(event: MouseEvent) {
    if (event.ctrlKey || event.metaKey || event.shiftKey) event.stopPropagation()
    else event.preventDefault()
  }

  return (
    <section aria-label="Events">
      {/* Result count */}
      <div className="mb-2 flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1" aria-live="polite">
        {query.data && (
          <p className="text-sm text-muted">
            <span className="font-mono font-semibold text-fg">{total.toLocaleString()}</span>{' '}
            {total === 1 ? 'event' : 'events'}
          </p>
        )}
        {loading && <p className="text-sm text-muted">Loading events…</p>}
        {slow && <SlowHint />}
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg text-muted">
            <tr>
              <th scope="col" className={HEAD}>Time</th>
              <th scope="col" className={HEAD}>Agent</th>
              <th scope="col" className={HEAD}>Tool call</th>
              <th scope="col" className={HEAD}>Status</th>
              <th scope="col" className={`${HEAD} text-right`}>Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {/* Loading */}
            {loading &&
              Array.from({ length: 10 }, (_, row) => (
                <tr key={row}>
                  {Array.from({ length: 5 }, (_, cell) => (
                    <td key={cell} className={CELL}>
                      <Skeleton />
                      <Skeleton className="mt-2 h-3 w-2/3 opacity-60" />
                    </td>
                  ))}
                </tr>
              ))}

            {/* Rows */}
            {events.map((event) => {
              const selected = event.id === selectedId
              const time = new Date(event.timestamp)
              return (
                <tr
                  key={event.id}
                  onClick={() => onSelect(event.id)}
                  className={`cursor-pointer hover:bg-bg ${selected ? 'bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]' : ''}`}
                >
                  <td className={`${CELL} whitespace-nowrap`}>
                    <a
                      id={`event-link-${event.id}`}
                      href={eventHref(event.id)}
                      onClick={handleLinkClick}
                      aria-current={selected ? 'true' : undefined}
                      className="rounded font-mono font-medium underline-offset-4 hover:text-accent hover:underline"
                    >
                      <time dateTime={event.timestamp}>{timeFormat.format(time)}</time>
                    </a>
                    <div className="text-xs text-muted">{dateFormat.format(time)}</div>
                  </td>
                  <td className={`${CELL} whitespace-nowrap font-medium`}>{event.agent}</td>
                  <td className={`${CELL} w-full max-w-0`}>
                    <div className="font-mono text-[13px]">{event.tool}</div>
                    <div className="truncate font-mono text-xs text-muted">{event.argsPreview}</div>
                  </td>
                  <td className={CELL}>
                    <StatusBadge status={event.status} />
                  </td>
                  <td className={`${CELL} whitespace-nowrap text-right`}>
                    <span className="font-mono tabular-nums">{event.latencyMs.toLocaleString()}</span>
                    <span className="text-xs text-muted"> ms</span>
                    <div aria-hidden="true" className="mt-1.5 ml-auto h-1 w-16 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-muted"
                        style={{ width: `${Math.min(100, (event.latencyMs / LATENCY_BAR_MAX_MS) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Error (first page) */}
        {query.isError && !query.data && !loading && (
          <ErrorState title="Could not load events" error={query.error} onRetry={() => query.refetch()} />
        )}

        {/* Empty */}
        {query.data && events.length === 0 && (
          <EmptyState title="No events found">
            {onClearFilters ? (
              <button type="button" onClick={onClearFilters} className="font-medium text-accent underline underline-offset-4">
                Clear search and filters
              </button>
            ) : (
              'There is no activity to show yet.'
            )}
          </EmptyState>
        )}
      </div>

      {/* Paging */}
      {events.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-muted">
          <p>
            Showing <span className="font-mono text-fg">{events.length.toLocaleString()}</span> of{' '}
            <span className="font-mono text-fg">{total.toLocaleString()}</span>
          </p>
          {isFetchingNextPage && <p role="status">Loading more…</p>}
          {isFetchNextPageError && !isFetchingNextPage && (
            <p role="alert">
              Could not load more events.{' '}
              <button type="button" onClick={() => fetchNextPage()} className="font-medium text-accent underline underline-offset-4">
                Try again
              </button>
            </p>
          )}
          {hasNextPage && !isFetchingNextPage && !isFetchNextPageError && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              className="rounded-md border border-line bg-surface px-4 py-1.5 font-medium text-fg hover:border-accent"
            >
              Load more
            </button>
          )}
          {!hasNextPage && <p>End of results</p>}
        </div>
      )}
      <div ref={endRef} />
    </section>
  )
}
