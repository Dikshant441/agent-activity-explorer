export type EventStatus = 'ok' | 'blocked' | 'error'

// List row
export interface EventSummary {
  id: string
  timestamp: string
  agent: string
  tool: string
  status: EventStatus
  latencyMs: number
  argsPreview: string
}

// Full event
export interface EventDetail extends Omit<EventSummary, 'argsPreview'> {
  args: unknown
  result: unknown
  policyMatches: string[]
}

// One page of results
export interface EventsPage {
  items: EventSummary[]
  nextCursor: string | null
  total: number
}

// Search and filter values
export interface EventFilters {
  q: string
  agents: string[]
  status: EventStatus | ''
}
