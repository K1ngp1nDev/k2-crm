type Tone = 'neutral' | 'success' | 'accent' | 'info' | 'danger'

export const STATUS_TONE: Record<string, Tone> = {
  created: 'neutral',
  paid: 'info',
  shipped: 'accent',
  completed: 'success',
  cancelled: 'danger',
}

export const STATUS_LABEL: Record<string, string> = {
  created: 'Created',
  paid: 'Paid',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function Badge({ children, tone = 'neutral' }: { children: string; tone?: Tone }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{STATUS_LABEL[status] ?? status}</Badge>
}
