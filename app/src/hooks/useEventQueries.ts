import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { fetchAgents, fetchEvent, fetchEvents } from '../api/events'
import type { EventFilters } from '../api/types'

// Event list, one page per cursor. New filters start a new list.
export function useEvents(filters: EventFilters) {
  return useInfiniteQuery({
    queryKey: ['events', filters],
    queryFn: ({ pageParam, signal }) => fetchEvents(filters, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

// Single event for the detail panel
export function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: ({ signal }) => fetchEvent(id, signal),
  })
}

// Agent names for the filter
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: ({ signal }) => fetchAgents(signal),
    staleTime: Infinity,
  })
}
