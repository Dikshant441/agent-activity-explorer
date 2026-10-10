import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '../api/client'
import { useEvent } from '../hooks/useEventQueries'
import { useIsSlow } from '../hooks/useIsSlow'
import { EmptyState, ErrorState, Skeleton, SlowHint } from './States'
import { StatusBadge } from './StatusBadge'

const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' })

// Longer JSON than this is cut until the user asks for all of it
const JSON_PREVIEW_CHARS = 5000

const LABEL = 'font-mono text-[11px] font-semibold uppercase tracking-widest text-muted'

export function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useEvent(id)
  const slow = useIsSlow(query.isFetching)
  const event = query.data
  // First load, or a retry after a failed load
  const loading = query.isFetching && !event
  const notFound = query.error instanceof ApiError && query.error.status === 404

  // Move focus into the panel when it opens
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => closeRef.current?.focus(), [])

  // Close with Escape
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <aside
      role="dialog"
      aria-labelledby="detail-title"
      className="fixed inset-y-0 right-0 z-20 flex w-full flex-col border-l border-line bg-surface shadow-2xl sm:w-120"
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className={LABEL}>Event</p>
          <h2 id="detail-title" className="truncate font-mono text-lg font-semibold">
            {event ? event.tool : 'Details'}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="flex shrink-0 items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:border-accent"
        >
          Close
          <kbd className="rounded border border-line bg-bg px-1 font-mono text-[11px] text-muted">Esc</kbd>
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-5" aria-live="polite">
        {slow && <SlowHint />}

        {/* Loading */}
        {loading && (
          <div className="space-y-3" aria-label="Loading event">
            <Skeleton className="w-2/3" />
            <Skeleton className="w-1/2" />
            <Skeleton className="w-3/4" />
            <Skeleton className="h-32" />
          </div>
        )}

        {/* Error */}
        {query.isError &&
          !loading &&
          (notFound ? (
            <EmptyState title="Event not found">This event does not exist or is no longer available.</EmptyState>
          ) : (
            <ErrorState title="Could not load this event" error={query.error} onRetry={() => query.refetch()} />
          ))}

        {/* Content */}
        {event && (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <Field label="Status">
                <StatusBadge status={event.status} />
              </Field>
              <Field label="Latency">
                <span className="font-mono">{event.latencyMs.toLocaleString()}</span> ms
              </Field>
              <Field label="Agent">{event.agent}</Field>
              <Field label="Time">
                <time dateTime={event.timestamp}>{timeFormat.format(new Date(event.timestamp))}</time>
              </Field>
              <Field label="ID" wide>
                <span className="break-all font-mono text-xs">{event.id}</span>
              </Field>
              <Field label="Policies matched" wide>
                {event.policyMatches.length === 0 ? (
                  <span className="text-muted">None</span>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {event.policyMatches.map((rule) => (
                      <li key={rule} className="rounded border border-line bg-bg px-2 py-0.5 font-mono text-xs">
                        {rule}
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </dl>

            <JsonBlock key={`args-${event.id}`} label="Args" value={event.args} />
            <JsonBlock key={`result-${event.id}`} label="Result" value={event.result} />
          </>
        )}
      </div>
    </aside>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className={LABEL}>{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

// Pretty-printed JSON. Rendered as text, never as HTML.
function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const [showAll, setShowAll] = useState(false)
  const text = useMemo(() => JSON.stringify(value, null, 2) ?? 'null', [value])
  const isLong = text.length > JSON_PREVIEW_CHARS

  return (
    <section>
      <h3 className={LABEL}>{label}</h3>
      <pre className="mt-1 max-h-96 overflow-auto rounded-md border border-line bg-bg p-3 font-mono text-xs leading-relaxed">
        {isLong && !showAll ? `${text.slice(0, JSON_PREVIEW_CHARS)}\n…` : text}
      </pre>
      {isLong && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-1 text-sm font-medium text-accent underline underline-offset-4"
        >
          {showAll ? 'Show less' : `Show all (${text.length.toLocaleString()} characters)`}
        </button>
      )}
    </section>
  )
}
