import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiRequestError } from '../api/client'
import type { Client, Order } from '../api/types'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { StatusBadge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/format'
import { formatMonth } from '../utils/format'

function tierFor(spentCents: number): { label: string; tone: 'success' | 'accent' | 'info' | 'neutral' } {
  if (spentCents >= 2_000_000) return { label: 'Platinum', tone: 'success' }
  if (spentCents >= 1_000_000) return { label: 'Gold', tone: 'accent' }
  if (spentCents >= 300_000) return { label: 'Silver', tone: 'info' }
  return { label: 'Bronze', tone: 'neutral' }
}

export function ClientsView() {
  const toast = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [selected, setSelected] = useState<Client | null>(null)
  const [clientOrders, setClientOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .listClients()
      .then(setClients)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openClient = (client: Client) => {
    setSelected(client)
    setOrdersLoading(true)
    api
      .listClientOrders(client.id)
      .then(setClientOrders)
      .catch((e) => toast.error(e.message))
      .finally(() => setOrdersLoading(false))
  }

  const stats = useMemo(() => {
    const total = clientOrders.reduce((s, o) => s + Number(o.total_amount) * 100, 0)
    const lastOrder = clientOrders[0]?.created_at ?? null
    const byMonth = new Map<string, number>()
    for (const o of clientOrders) {
      const key = o.created_at.slice(0, 7)
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(o.total_amount))
    }
    const revenueHistory = [...byMonth.entries()].sort().map(([key, value]) => ({ key, value }))
    return { totalCents: total, orders: clientOrders.length, lastOrder, tier: tierFor(total), revenueHistory }
  }, [clientOrders])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const created = await api.createClient({ name, email: email || null, phone: phone || null })
      toast.success(`Client “${created.name}” created`)
      setName('')
      setEmail('')
      setPhone('')
      load()
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not create the client')
    } finally {
      setSaving(false)
    }
  }

  const maxRev = Math.max(1, ...stats.revenueHistory.map((r) => r.value))

  return (
    <div className="split">
      <div className="split__aside">
        <Card title="New client">
          <form className="form" onSubmit={submit}>
            <Field label="Company / name" required htmlFor="c-name">
              <input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Northwind Trading Co." required />
            </Field>
            <Field label="Email" htmlFor="c-email">
              <input id="c-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ops@northwind.example" />
            </Field>
            <Field label="Phone" htmlFor="c-phone">
              <input id="c-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 415 555 0142" />
            </Field>
            <Button type="submit" loading={saving}>
              <Icon name="plus" size={16} />
              Create client
            </Button>
          </form>
        </Card>
      </div>

      <div className="split__main">
        <Card title="Clients" subtitle={`${clients.length} records · click a row for detail`}>
          {loading ? (
            <div className="center">
              <Spinner size={26} />
            </div>
          ) : clients.length === 0 ? (
            <EmptyState icon="clients" title="No clients yet" description="Add your first client in the form on the left." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} onClick={() => openClient(c)} style={{ cursor: 'pointer' }}>
                      <td className="mono">#{c.id}</td>
                      <td className="strong">{c.name}</td>
                      <td>{c.email ?? '—'}</td>
                      <td>{c.phone ?? '—'}</td>
                      <td className="muted">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={selected !== null}
        title={selected?.name ?? ''}
        subtitle={selected?.email ?? undefined}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="stack">
            <div className="kv">
              <div>
                <p className="kv__label">Tier</p>
                <p className="kv__value">
                  <Badge tone={stats.tier.tone}>{stats.tier.label}</Badge>
                </p>
              </div>
              <div>
                <p className="kv__label">Total revenue</p>
                <p className="kv__value">{formatMoney(stats.totalCents / 100)}</p>
              </div>
              <div>
                <p className="kv__label">Orders</p>
                <p className="kv__value">{stats.orders}</p>
              </div>
              <div>
                <p className="kv__label">Last order</p>
                <p className="kv__value">{stats.lastOrder ? formatDate(stats.lastOrder) : '—'}</p>
              </div>
            </div>

            {selected.note && (
              <div className="banner">
                <Icon name="info" size={18} />
                <span>{selected.note}</span>
              </div>
            )}

            <div>
              <p className="field__label" style={{ marginBottom: 8 }}>Revenue history</p>
              {ordersLoading ? (
                <div className="center" style={{ padding: 16 }}><Spinner size={22} /></div>
              ) : stats.revenueHistory.length === 0 ? (
                <p className="muted small">No orders yet.</p>
              ) : (
                <div className="barlist">
                  {stats.revenueHistory.map((r) => (
                    <div className="barlist__row" key={r.key}>
                      <div className="barlist__head">
                        <span className="barlist__label">{formatMonth(r.key)}</span>
                        <span className="barlist__value mono">{formatMoney(r.value)}</span>
                      </div>
                      <div className="barlist__track">
                        <div className="barlist__fill" style={{ width: `${(r.value / maxRev) * 100}%`, background: 'var(--c-line)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="field__label" style={{ marginBottom: 8 }}>Order history</p>
              {clientOrders.length === 0 ? (
                <p className="muted small">No orders.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th className="num">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="mono">#{o.id}</td>
                          <td className="muted">{formatDate(o.created_at)}</td>
                          <td><StatusBadge status={o.status} /></td>
                          <td className="num strong">{formatMoney(o.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
