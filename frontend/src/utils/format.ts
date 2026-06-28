export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d)
}

// Turns an "YYYY-MM" bucket key into a short month label, e.g. "Jan".
export function formatMonth(key: string): string {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
    new Date(y, m - 1, 1),
  )
}
