import type { EventStatus } from '../api/types'

// "ok" stays quiet so blocked and error stand out in a long list
const STYLES: Record<EventStatus, string> = {
  ok: 'text-ok',
  blocked: 'bg-blocked/10 text-blocked',
  error: 'bg-error/10 text-error',
}

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}
