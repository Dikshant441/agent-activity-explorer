// Base URL (from app/.env)
const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

// Retry settings
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 400

// Error with HTTP status
export class ApiError extends Error {
  status: number

  constructor(status: number) {
    super(`Request failed with status ${status}`)
    this.status = status
  }
}

type Params = Record<string, string | string[] | number | undefined>

export async function apiGet<T>(path: string, params: Params = {}, signal?: AbortSignal): Promise<T> {
  // Build URL (arrays repeat: ?agent=a&agent=b)
  const url = new URL(path, API_URL)
  for (const [key, value] of Object.entries(params)) {
    for (const v of [value].flat()) {
      if (v !== undefined && v !== '') url.searchParams.append(key, String(v))
    }
  }

  // Fetch with retry (5xx and network errors only)
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { signal })
      if (!response.ok) throw new ApiError(response.status)
      return await response.json()
    } catch (error) {
      const isClientError = error instanceof ApiError && error.status < 500
      if (signal?.aborted || isClientError || attempt >= MAX_RETRIES) throw error
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
    }
  }
}
