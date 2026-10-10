import { useEffect, useRef, useState } from 'react'
import type { EventFilters, EventStatus } from '../api/types'
import { useAgents } from '../hooks/useEventQueries'

const CONTROL = 'rounded-md border border-line bg-surface px-3 py-1.5 text-sm'
const SEARCH_DELAY_MS = 300

const STATUS_OPTIONS: { value: EventStatus | ''; label: string; dot: string }[] = [
  { value: '', label: 'All', dot: '' },
  { value: 'ok', label: 'ok', dot: 'bg-ok' },
  { value: 'blocked', label: 'blocked', dot: 'bg-blocked' },
  { value: 'error', label: 'error', dot: 'bg-error' },
]

interface Props {
  filters: EventFilters
  onChange: (patch: Partial<EventFilters>) => void
  // Only passed when a search or filter is active
  onClear?: () => void
}

export function Filters({ filters, onChange, onClear }: Props) {
  return (
    <form role="search" onSubmit={(event) => event.preventDefault()} className="mb-5 flex flex-wrap items-center gap-2">
      <SearchBox value={filters.q} onSearch={(q) => onChange({ q })} />
      <AgentFilter selected={filters.agents} onChange={(agents) => onChange({ agents })} />

      {/* Status: one button per option */}
      <div role="group" aria-label="Status" className="flex rounded-md border border-line bg-surface p-0.5">
        {STATUS_OPTIONS.map((option) => {
          const active = filters.status === option.value
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ status: option.value })}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-sm ${
                active ? 'bg-fg font-semibold text-bg' : 'text-muted hover:text-fg'
              }`}
            >
              {option.dot && <span aria-hidden="true" className={`size-1.5 rounded-full ${option.dot}`} />}
              {option.label}
            </button>
          )
        })}
      </div>

      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="px-2 py-1.5 text-sm font-medium text-accent underline underline-offset-4"
        >
          Clear all
        </button>
      )}
    </form>
  )
}

// Search input. The URL is updated a moment after the user stops typing.
function SearchBox({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  // Text being typed. null means "show the value from the URL".
  const [draft, setDraft] = useState<string | null>(null)
  const timer = useRef<number>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function handleChange(text: string) {
    setDraft(text)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      onSearch(text.trim())
      setDraft(null)
    }, SEARCH_DELAY_MS)
  }

  return (
    <>
      <label className="sr-only" htmlFor="search">
        Search events
      </label>
      <input
        id="search"
        type="search"
        placeholder="Search agent, tool or args…"
        value={draft ?? value}
        onChange={(event) => handleChange(event.target.value)}
        className={`${CONTROL} w-full font-mono placeholder:font-sans placeholder:text-muted sm:w-80`}
      />
    </>
  )
}

// Dropdown with one checkbox per agent
function AgentFilter({ selected, onChange }: { selected: string[]; onChange: (agents: string[]) => void }) {
  const agents = useAgents()
  const ref = useRef<HTMLDetailsElement>(null)

  // Close on outside click
  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      const details = ref.current
      if (details?.open && !details.contains(event.target as Node)) details.open = false
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function toggle(agent: string) {
    onChange(selected.includes(agent) ? selected.filter((a) => a !== agent) : [...selected, agent])
  }

  return (
    <details
      ref={ref}
      className="relative"
      onKeyDown={(event) => {
        // Escape closes the dropdown only, not the detail panel
        if (event.key !== 'Escape' || !ref.current?.open) return
        event.stopPropagation()
        ref.current.open = false
        ref.current.querySelector('summary')?.focus()
      }}
    >
      <summary className={`${CONTROL} flex cursor-pointer list-none items-center gap-2 select-none`}>
        Agents
        <span
          className={`rounded-full px-1.5 font-mono text-xs ${
            selected.length > 0 ? 'bg-accent font-semibold text-bg' : 'bg-bg text-muted'
          }`}
        >
          {selected.length > 0 ? selected.length : 'all'}
        </span>
      </summary>

      <div className="absolute z-10 mt-1 max-h-72 w-60 overflow-y-auto rounded-md border border-line bg-surface p-1.5 shadow-lg">
        {agents.isPending && <p className="p-2 text-sm text-muted">Loading agents…</p>}

        {agents.isError && (
          <p role="alert" className="p-2 text-sm text-muted">
            Could not load agents.{' '}
            <button type="button" onClick={() => agents.refetch()} className="font-medium text-accent underline">
              Try again
            </button>
          </p>
        )}

        {agents.data?.length === 0 && <p className="p-2 text-sm text-muted">No agents found.</p>}

        {agents.data?.map((agent) => (
          <label key={agent} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-bg">
            <input
              type="checkbox"
              checked={selected.includes(agent)}
              onChange={() => toggle(agent)}
              className="accent-(--accent)"
            />
            {agent}
          </label>
        ))}
      </div>
    </details>
  )
}
