import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { Reports } from '../api/types'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Spinner } from '../components/Spinner'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { AreaChart } from '../components/charts/AreaChart'
import { BarList } from '../components/charts/BarList'
import { DonutChart } from '../components/charts/DonutChart'
import { formatMoneyCompact } from '../utils/money'
import { formatMonth } from '../utils/format'

const CATEGORY_COLORS = [
  'var(--c-line)',
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#ec4899',
  '#8b5cf6',
  '#f43f5e',
  '#64748b',
]

const TREND_STATUSES = ['created', 'paid', 'shipped', 'completed', 'cancelled'] as const

export function ReportsView() {
  const toast = useToast()
  const [reports, setReports] = useState<Reports | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .reports()
      .then(setReports)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [toast])

  const salesData = useMemo(
    () => (reports?.sales_by_month ?? []).map((m) => ({ label: formatMonth(m.month), value: Number(m.revenue) })),
    [reports],
  )
  const clientBars = useMemo(
    () =>
      (reports?.revenue_by_client ?? []).map((c) => ({
        label: c.name,
        value: Number(c.revenue),
        sub: `${c.orders} orders`,
      })),
    [reports],
  )
  const categoryDonut = useMemo(
    () =>
      (reports?.revenue_by_category ?? []).map((c, i) => ({
        label: c.category,
        value: Number(c.revenue),
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })),
    [reports],
  )

  const exportCsv = () => {
    if (!reports) return
    const rows = [
      ['Month', 'Revenue', 'Orders'],
      ...reports.sales_by_month.map((m) => [formatMonth(m.month), m.revenue, String(m.orders)]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'k2-sales-report.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Sales report exported (CSV)')
  }

  if (loading) {
    return (
      <div className="center">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <span className="muted small">Aggregated sales, client and category performance.</span>
        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <Icon name="trend" size={16} />
          Export CSV
        </Button>
      </div>

      <Card title="Sales by month" subtitle="Revenue across all channels (excl. cancelled)">
        <AreaChart data={salesData} formatValue={formatMoneyCompact} />
      </Card>

      <div className="dash-row">
        <Card title="Revenue by client" subtitle="Top accounts">
          {clientBars.length === 0 ? (
            <p className="muted small">No data.</p>
          ) : (
            <BarList data={clientBars} formatValue={formatMoneyCompact} />
          )}
        </Card>
        <Card title="Revenue by category">
          {categoryDonut.length === 0 ? (
            <p className="muted small">No data.</p>
          ) : (
            <DonutChart
              data={categoryDonut}
              centerValue={formatMoneyCompact(categoryDonut.reduce((s, c) => s + c.value, 0))}
              centerLabel="revenue"
            />
          )}
        </Card>
      </div>

      <Card title="Order status trend" subtitle="Monthly order counts by status">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                {TREND_STATUSES.map((s) => (
                  <th key={s} className="num" style={{ textTransform: 'capitalize' }}>
                    {s}
                  </th>
                ))}
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {(reports?.status_trend ?? []).map((row) => {
                const total = TREND_STATUSES.reduce((s, k) => s + row[k], 0)
                return (
                  <tr key={row.month}>
                    <td className="strong">{formatMonth(row.month)}</td>
                    {TREND_STATUSES.map((s) => (
                      <td key={s} className="num">
                        {row[s] || <span className="muted">—</span>}
                      </td>
                    ))}
                    <td className="num strong">{total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
