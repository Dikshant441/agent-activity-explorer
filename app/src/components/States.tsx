import type { ReactNode } from 'react'
import { ApiError } from '../api/client'

// Plain-language reason for a failed request
function describeError(error: unknown) {
  if (error instanceof ApiError) return `The server responded with an error (${error.status}).`
  return 'Could not reach the server. Check that the API is running.'
}

// Error with a retry button
export function ErrorState({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="px-6 py-12 text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-error">Error</p>
      <p className="mt-2 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{describeError(error)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-bg hover:opacity-90"
      >
        Try again
      </button>
    </div>
  )
}

// Nothing to show
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">Nothing here</p>
      <p className="mt-2 font-semibold">{title}</p>
      <div className="mt-1 text-sm text-muted">{children}</div>
    </div>
  )
}

// Shown when a request takes longer than usual
export function SlowHint() {
  return (
    <p role="status" className="rounded-full bg-blocked/10 px-2.5 py-0.5 text-xs font-medium text-blocked">
      Still loading. The server is taking longer than usual.
    </p>
  )
}

// Placeholder bar
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`h-4 rounded bg-line motion-safe:animate-pulse ${className}`} />
}
