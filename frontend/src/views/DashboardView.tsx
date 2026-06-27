import { useEffect, useMemo, useState } from 'react'
import type { View } from '../App'
import { api } from '../api/client'
import type { Client, Order, Stats } from '../api/types'
import { StatCard } from '../components/StatCard'
import { Card } from '../components/Card'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/Badge'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/format'

export function DashboardView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const toast = useToast()
  const [stats, setStats] = useState<Stats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.stats(), api.listOrders(), api.listClients()])
      .then(([s, o, c]) => {
        setStats(s)
        setOrders(o.slice(0, 6))
        setClients(c)
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [toast])

  const clientName = useMemo(() => {
    const map = new Map(clients.map((c) => [c.id, c.name]))
    return (id: number) => map.get(id) ?? `#${id}`
  }, [clients])

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
        <StatCard icon="clients" tone="primary" label="Клієнтів" value={stats?.clients ?? 0} />
        <StatCard icon="products" tone="info" label="Товарів" value={stats?.products ?? 0} />
        <StatCard icon="orders" tone="accent" label="Замовлень" value={stats?.orders ?? 0} />
        <StatCard
          icon="dashboard"
          tone="success"
          label="Виторг"
          value={formatMoney(stats?.revenue ?? '0')}
        />
      </div>

      <Card
        title="Останні замовлення"
        action={
          <Button variant="secondary" size="sm" onClick={() => onNavigate('orders')}>
            <Icon name="plus" size={16} />
            Нове замовлення
          </Button>
        }
      >
        {orders.length === 0 ? (
          <EmptyState
            icon="orders"
            title="Ще немає замовлень"
            description="Створіть перше замовлення у розділі «Замовлення»."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Клієнт</th>
                  <th>Дата</th>
                  <th>Статус</th>
                  <th className="num">Сума</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">#{o.id}</td>
                    <td className="strong">{clientName(o.client_id)}</td>
                    <td className="muted">{formatDate(o.created_at)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="num strong">{formatMoney(o.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
