import { useEffect, useMemo, useState } from 'react'
import type { View } from '../App'
import { api } from '../api/client'
import type { Analytics, Client, Order } from '../api/types'
import { StatCard } from '../components/StatCard'
import { Card } from '../components/Card'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge, STATUS_LABEL } from '../components/Badge'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { AreaChart } from '../components/charts/AreaChart'
import { DonutChart } from '../components/charts/DonutChart'
import { BarList } from '../components/charts/BarList'
import { formatMoney, formatMoneyCompact } from '../utils/money'
import { formatMonth, formatDate } from '../utils/format'

const STATUS_COLOR: Record<string, string> = {
  created: 'var(--c-neutral)',
  paid: 'var(--c-info)',
  shipped: 'var(--c-accent)',
  completed: 'var(--c-success)',
  cancelled: 'var(--c-danger)',
}

export function DashboardView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const toast = useToast()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.analytics(), api.listOrders(), api.listClients()])
      .then(([a, o, c]) => {
        setAnalytics(a)
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

  const revenueDelta = useMemo(() => {
    const series = analytics?.revenue_by_month ?? []
    if (series.length < 2) return undefined
    const curr = Number(series[series.length - 1].revenue)
    const prev = Number(series[series.length - 2].revenue)
    if (!prev) return undefined
    const pct = ((curr - prev) / prev) * 100
    return {
      value: `${Math.abs(pct).toFixed(1)}%`,
      direction: pct >= 0 ? ('up' as const) : ('down' as const),
    }
  }, [analytics])

  if (loading) {
    return (
      <div className="center">
        <Spinner size={28} />
      </div>
    )
  }

  const kpis = analytics?.kpis
  const statusSlices = (analytics?.orders_by_status ?? []).map((s) => ({
    label: STATUS_LABEL[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLOR[s.status] ?? 'var(--c-neutral)',
  }))
  const topProducts = (analytics?.top_products ?? []).map((p) => ({
    label: p.name,
    value: Number(p.revenue),
    sub: `${p.quantity} units sold`,
  }))
  const revenueSeries = (analytics?.revenue_by_month ?? []).map((p) => ({
    label: formatMonth(p.month),
    value: Number(p.revenue),
  }))

  return (
    <div className="stack">
      <div className="stats-grid">
        <StatCard
          icon="dashboard"
          tone="success"
          label="Total revenue"
          value={formatMoney(kpis?.revenue ?? '0')}
          delta={revenueDelta}
        />
        <StatCard icon="orders" tone="accent" label="Orders" value={kpis?.orders ?? 0} />
        <StatCard
          icon="trend"
          tone="info"
          label="Avg. order value"
          value={formatMoney(kpis?.avg_order_value ?? '0')}
        />
        <StatCard icon="clients" tone="primary" label="Active clients" value={kpis?.clients ?? 0} />
      </div>

      <Card title="Revenue" subtitle="Last 6 months">
        <AreaChart data={revenueSeries} formatValue={formatMoneyCompact} />
      </Card>

      <div className="dash-row">
        <Card title="Orders by status">
          {statusSlices.length === 0 ? (
            <EmptyState icon="orders" title="No orders yet" />
          ) : (
            <DonutChart
              data={statusSlices}
              centerValue={kpis?.orders ?? 0}
              centerLabel="orders"
            />
          )}
        </Card>

        <Card title="Top products" subtitle="By revenue">
          {topProducts.length === 0 ? (
            <EmptyState icon="products" title="No sales yet" />
          ) : (
            <BarList data={topProducts} formatValue={formatMoneyCompact} />
          )}
        </Card>
      </div>

      <Card
        title="Recent orders"
        action={
          <Button variant="secondary" size="sm" onClick={() => onNavigate('orders')}>
            <Icon name="plus" size={16} />
            New order
          </Button>
        }
      >
        {orders.length === 0 ? (
          <EmptyState
            icon="orders"
            title="No orders yet"
            description="Create your first order in the Orders section."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="num">Amount</th>
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
