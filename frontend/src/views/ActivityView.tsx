import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { ActivityEvent } from '../api/types'
import { Card } from '../components/Card'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { useToast } from '../components/Toast'
import { formatDate } from '../utils/format'

const TYPE_ICON: Record<ActivityEvent['type'], IconName> = {
  order: 'orders',
  client: 'clients',
  product: 'products',
  system: 'alert',
}

export function ActivityView() {
  const toast = useToast()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | ActivityEvent['type']>('all')

  useEffect(() => {
    api
      .activity()
      .then(setEvents)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [toast])

  const filtered = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.type === filter)),
    [events, filter],
  )
  const lateOrCancelled = useMemo(
    () => events.filter((e) => e.type === 'order' && e.title.includes('cancelled')),
    [events],
  )

  if (loading) {
    return (
      <div className="center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="stats-grid">
        <div className="card" style={{ padding: 18 }}>
          <p className="small muted">Total events</p>
          <p className="strong" style={{ fontSize: 22 }}>{events.length}</p>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <p className="small muted">Warnings</p>
          <p className="strong" style={{ fontSize: 22, color: 'var(--accent-text)' }}>
            {events.filter((e) => e.severity === 'warning').length}
          </p>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <p className="small muted">Cancelled orders</p>
          <p className="strong" style={{ fontSize: 22, color: 'var(--danger)' }}>{lateOrCancelled.length}</p>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <p className="small muted">Low-stock alerts</p>
          <p className="strong" style={{ fontSize: 22, color: 'var(--accent-text)' }}>
            {events.filter((e) => e.id.startsWith('lowstock')).length}
          </p>
        </div>
      </div>

      <Card
        title="Activity log"
        subtitle="Recent operational events"
        action={
          <select
            className="select select--inline"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            aria-label="Filter by type"
          >
            <option value="all">All events</option>
            <option value="order">Orders</option>
            <option value="client">Clients</option>
            <option value="product">Products</option>
            <option value="system">System</option>
          </select>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState icon="inbox" title="No events" description="Nothing matches this filter." />
        ) : (
          <div className="activity">
            {filtered.map((e) => (
              <div className="activity__item" key={e.id}>
                <div className={`activity__dot activity__dot--${e.severity}`}>
                  <Icon name={TYPE_ICON[e.type]} size={16} />
                </div>
                <div className="activity__body">
                  <p className="activity__title">{e.title}</p>
                  <p className="activity__detail">{e.detail}</p>
                </div>
                <span className="activity__time">{formatDate(e.at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
