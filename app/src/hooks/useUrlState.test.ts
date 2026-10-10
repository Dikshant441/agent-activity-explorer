import { expect, it } from 'vitest'
import { buildSearch, parseSearch } from './useUrlState'
import type { UrlState } from './useUrlState'

const empty: UrlState = { q: '', agents: [], status: '', eventId: '' }

it('reads an empty URL as empty state, and writes it back as an empty URL', () => {
  expect(parseSearch('')).toEqual(empty)
  expect(buildSearch(empty)).toBe('')
})

it('reads search, repeated agents, status and the open event', () => {
  expect(parseSearch('?q=stripe&agent=a&agent=b&status=blocked&event=evt_1')).toEqual({
    q: 'stripe',
    agents: ['a', 'b'],
    status: 'blocked',
    eventId: 'evt_1',
  })
})

it('ignores a status the API does not accept', () => {
  expect(parseSearch('?status=bogus').status).toBe('')
})

it('round-trips state through the URL, including special characters', () => {
  const state = { q: 'a&b = c?', agents: ['x y', 'z'], status: 'error' as const, eventId: 'evt_9' }
  expect(buildSearch(state)).toContain('agent=x+y&agent=z')
  expect(parseSearch(buildSearch(state))).toEqual(state)
})
