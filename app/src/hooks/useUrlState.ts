import { useCallback, useEffect, useState } from 'react'
import type { EventFilters, EventStatus } from '../api/types'

// Everything the URL remembers
export interface UrlState extends EventFilters {
  eventId: string
}

// URL -> state
export function parseSearch(search: string): UrlState {
  const params = new URLSearchParams(search)
  const status = params.get('status') as EventStatus
  return {
    q: params.get('q') ?? '',
    agents: params.getAll('agent'),
    status: ['ok', 'blocked', 'error'].includes(status) ? status : '',
    eventId: params.get('event') ?? '',
  }
}

// State -> URL
export function buildSearch(state: UrlState) {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  for (const agent of state.agents) params.append('agent', agent)
  if (state.status) params.set('status', state.status)
  if (state.eventId) params.set('event', state.eventId)
  return params.size > 0 ? `?${params}` : ''
}

export function useUrlState() {
  const [state, setState] = useState(() => parseSearch(location.search))

  // Back / forward buttons
  useEffect(() => {
    const onPopState = () => setState(parseSearch(location.search))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Change part of the state and add a history entry
  const update = useCallback((patch: Partial<UrlState>) => {
    const next = { ...parseSearch(location.search), ...patch }
    const search = buildSearch(next)
    if (search === location.search) return
    history.pushState(null, '', location.pathname + search)
    setState(next)
  }, [])

  return [state, update] as const
}
