import { apiGet } from './client'
import type { EventDetail, EventFilters, EventsPage } from './types'

// Event list (search, filters, paging)
export function fetchEvents(filters: EventFilters, cursor?: string, signal?: AbortSignal) {
  const params = { q: filters.q, agent: filters.agents, status: filters.status, cursor, limit: 50 }
  return apiGet<EventsPage>('/events', params, signal)
}

// Single event (detail panel)
export function fetchEvent(id: string, signal?: AbortSignal) {
  return apiGet<EventDetail>(`/events/${encodeURIComponent(id)}`, {}, signal)
}

// Agent names (filter options)
export function fetchAgents(signal?: AbortSignal) {
  return apiGet<string[]>('/agents', {}, signal)
}
