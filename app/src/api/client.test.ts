import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { apiGet } from './client'

const fetchMock = vi.fn()
const respond = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status })

// Skip the retry delays, then return the result (or the error)
async function run(promise: Promise<unknown>) {
  const result = promise.catch((error) => error)
  await vi.runAllTimersAsync()
  return result
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.useRealTimers()
})

it('builds the URL, repeating arrays and skipping empty values', async () => {
  fetchMock.mockResolvedValue(respond(200))
  await run(apiGet('/events', { q: 'stripe', agent: ['a', 'b'], status: '', cursor: undefined, limit: 50 }))

  expect(new URL(fetchMock.mock.calls[0][0]).search).toBe('?q=stripe&agent=a&agent=b&limit=50')
})

it('retries a server error and returns the later success', async () => {
  fetchMock.mockResolvedValueOnce(respond(500)).mockResolvedValueOnce(respond(200, { ok: true }))

  expect(await run(apiGet('/events'))).toEqual({ ok: true })
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('gives up after three attempts', async () => {
  fetchMock.mockImplementation(async () => respond(500))

  expect(await run(apiGet('/events'))).toMatchObject({ status: 500 })
  expect(fetchMock).toHaveBeenCalledTimes(3)
})

it('does not retry a client error', async () => {
  fetchMock.mockImplementation(async () => respond(404))

  expect(await run(apiGet('/events/nope'))).toMatchObject({ status: 404 })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('does not retry a cancelled request', async () => {
  const controller = new AbortController()
  controller.abort()
  fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'))

  expect(await run(apiGet('/events', {}, controller.signal))).toMatchObject({ name: 'AbortError' })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
