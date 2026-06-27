type Tone = 'neutral' | 'success' | 'accent' | 'info'

const STATUS_TONE: Record<string, Tone> = {
  created: 'info',
  paid: 'success',
  shipped: 'accent',
  cancelled: 'neutral',
}

const STATUS_LABEL: Record<string, string> = {
  created: 'Створено',
  paid: 'Оплачено',
  shipped: 'Відвантажено',
  cancelled: 'Скасовано',
}

export function Badge({ children, tone = 'neutral' }: { children: string; tone?: Tone }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{STATUS_LABEL[status] ?? status}</Badge>
}
