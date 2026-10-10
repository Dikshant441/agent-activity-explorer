import { useCallback } from 'react'
import { DetailPanel } from './components/DetailPanel'
import { EventTable } from './components/EventTable'
import { Filters } from './components/Filters'
import { buildSearch, useUrlState } from './hooks/useUrlState'

function App() {
  // Search, filters and the open event all live in the URL
  const [url, setUrl] = useUrlState()
  const { eventId, ...filters } = url
  const hasFilters = filters.q !== '' || filters.agents.length > 0 || filters.status !== ''
  const clearFilters = hasFilters ? () => setUrl({ q: '', agents: [], status: '' }) : undefined

  // Close the panel and put focus back on the row it was opened from
  const closePanel = useCallback(() => {
    setUrl({ eventId: '' })
    document.getElementById(`event-link-${eventId}`)?.focus()
  }, [setUrl, eventId])

  return (
    // Leave room for the panel on wide screens
    <div className={eventId ? 'lg:mr-120' : ''}>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-md bg-accent font-mono text-sm font-bold text-bg">
            {'>_'}
          </span>
          <div>
            <h1 className="font-semibold leading-tight">Agent Activity Explorer</h1>
            <p className="text-xs text-muted">Every tool call your agents made, and what policy did with it</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <Filters filters={filters} onChange={setUrl} onClear={clearFilters} />
        <EventTable
          filters={filters}
          selectedId={eventId}
          eventHref={(id) => buildSearch({ ...url, eventId: id })}
          onSelect={(id) => setUrl({ eventId: id })}
          onClearFilters={clearFilters}
        />
      </main>
      {eventId && <DetailPanel id={eventId} onClose={closePanel} />}
    </div>
  )
}

export default App
