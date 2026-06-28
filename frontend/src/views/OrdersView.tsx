import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiRequestError } from '../api/client'
import type { Client, Order, Product } from '../api/types'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { Icon } from '../components/Icon'
import { StatusBadge, STATUS_LABEL } from '../components/Badge'
import { useToast } from '../components/Toast'
import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/format'

const STATUS_OPTIONS = ['created', 'paid', 'shipped', 'completed', 'cancelled']

interface Line {
  key: number
  product_id: number
  quantity: number
}

function QtyStepper({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (n: number) => void
  label: string
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText(String(value))
  }, [value])

  const commit = (raw: string) => {
    const n = Math.floor(Number(raw))
    onChange(Number.isFinite(n) && n >= 1 ? n : 1)
  }

  return (
    <div className="qty">
      <button
        type="button"
        className="qty__btn"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Decrease"
      >
        <Icon name="minus" size={14} />
      </button>
      <input
        className="qty__input"
        type="number"
        min={1}
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
      />
      <button
        type="button"
        className="qty__btn"
        onClick={() => onChange(value + 1)}
        aria-label="Increase"
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  )
}

export function OrdersView() {
  const toast = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [ready, setReady] = useState(false)

  const [clientId, setClientId] = useState<number | ''>('')
  const [lines, setLines] = useState<Line[]>([])
  const [saving, setSaving] = useState(false)
  const lineKey = useRef(0)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const reloadOrders = () =>
    api
      .listOrders()
      .then(setOrders)
      .catch((e) => toast.error(e.message))

  useEffect(() => {
    Promise.all([api.listClients(), api.listProducts(), api.listOrders()])
      .then(([c, p, o]) => {
        setClients(c)
        setProducts(p)
        setOrders(o)
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setReady(true))
  }, [toast])

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  )
  const clientName = useMemo(() => {
    const map = new Map(clients.map((c) => [c.id, c.name]))
    return (id: number) => map.get(id) ?? `#${id}`
  }, [clients])

  const previewTotal = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + Number(productById.get(l.product_id)?.price ?? 0) * l.quantity,
        0,
      ),
    [lines, productById],
  )

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false
      if (!q) return true
      return (
        clientName(o.client_id).toLowerCase().includes(q) ||
        String(o.id).includes(q.replace('#', ''))
      )
    })
  }, [orders, statusFilter, search, clientName])

  const addLine = () => {
    if (products.length === 0) return
    lineKey.current += 1
    setLines((ls) => [...ls, { key: lineKey.current, product_id: products[0].id, quantity: 1 }])
  }

  const updateLine = (key: number, patch: Partial<Omit<Line, 'key'>>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const removeLine = (key: number) => setLines((ls) => ls.filter((l) => l.key !== key))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (clientId === '') {
      toast.error('Select a client')
      return
    }
    if (lines.length === 0) {
      toast.error('Add at least one item')
      return
    }
    setSaving(true)
    try {
      const order = await api.createOrder({
        client_id: clientId,
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      })
      toast.success(`Order #${order.id} created — ${formatMoney(order.total_amount)}`)
      setLines([])
      setExpanded(order.id)
      await reloadOrders()
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not create the order')
    } finally {
      setSaving(false)
    }
  }

  if (!ready) {
    return (
      <div className="center">
        <Spinner size={28} />
      </div>
    )
  }

  const missingData = clients.length === 0 || products.length === 0

  return (
    <div className="stack">
      {missingData && (
        <div className="banner">
          <Icon name="info" size={18} />
          <span>
            To create an order, first add at least one <strong>client</strong> and one{' '}
            <strong>product</strong> in their sections.
          </span>
        </div>
      )}

      <form className="order-builder" onSubmit={submit}>
        <Card title="New order" className="order-builder__form">
          <Field label="Client" required htmlFor="o-client">
            <select
              id="o-client"
              className="select"
              value={clientId}
              onChange={(e) => setClientId(e.target.value === '' ? '' : Number(e.target.value))}
              required
            >
              <option value="">— Select a client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="lines">
            <div className="lines__head">
              <span>Order items</span>
              <Button type="button" variant="ghost" size="sm" onClick={addLine} disabled={products.length === 0}>
                <Icon name="plus" size={16} />
                Add item
              </Button>
            </div>

            {lines.length === 0 ? (
              <p className="lines__empty muted small">Add at least one item.</p>
            ) : (
              lines.map((line, idx) => {
                const product = productById.get(line.product_id)
                const lineTotal = Number(product?.price ?? 0) * line.quantity
                return (
                  <div className="line" key={line.key}>
                    <select
                      className="select line__product"
                      value={line.product_id}
                      aria-label={`Product, row ${idx + 1}`}
                      onChange={(e) => updateLine(line.key, { product_id: Number(e.target.value) })}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {formatMoney(p.price)}
                        </option>
                      ))}
                    </select>

                    <QtyStepper
                      value={line.quantity}
                      label={`Quantity, row ${idx + 1}`}
                      onChange={(q) => updateLine(line.key, { quantity: q })}
                    />

                    <span className="line__total mono">{formatMoney(lineTotal)}</span>

                    <button
                      type="button"
                      className="line__remove"
                      onClick={() => removeLine(line.key)}
                      aria-label="Remove item"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        <aside className="summary">
          <h3 className="summary__title">Summary</h3>
          <div className="summary__lines">
            {lines.length === 0 ? (
              <p className="muted small">The summary appears once you add items.</p>
            ) : (
              lines.map((line) => {
                const product = productById.get(line.product_id)
                return (
                  <div className="summary__row" key={line.key}>
                    <span className="summary__name">
                      {product?.name ?? '—'} <span className="muted">× {line.quantity}</span>
                    </span>
                    <span className="mono">
                      {formatMoney(Number(product?.price ?? 0) * line.quantity)}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          <div className="summary__total">
            <span>Total</span>
            <span className="summary__amount">{formatMoney(previewTotal)}</span>
          </div>

          <p className="summary__note">
            The server computes the final amount on creation — this is a preview.
          </p>

          <Button
            type="submit"
            loading={saving}
            disabled={clientId === '' || lines.length === 0}
          >
            Create order
          </Button>

          {(clientId === '' || lines.length === 0) && (
            <p className="summary__note">Select a client and add at least one item.</p>
          )}
        </aside>
      </form>

      <Card
        title="All orders"
        subtitle={`${filteredOrders.length} of ${orders.length}`}
        action={
          <div className="toolbar">
            <div className="search">
              <Icon name="search" size={16} />
              <input
                className="search__input"
                placeholder="Search by client or #id"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search orders"
              />
            </div>
            <select
              className="select select--inline"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {orders.length === 0 ? (
          <EmptyState
            icon="orders"
            title="No orders yet"
            description="Create your first order in the form above."
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon="search"
            title="No matching orders"
            description="Try a different search term or status filter."
          />
        ) : (
          <div className="orders">
            {filteredOrders.map((o) => (
              <div className="order" key={o.id}>
                <button
                  type="button"
                  className="order__head"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  aria-expanded={expanded === o.id}
                >
                  <span className="order__id mono">#{o.id}</span>
                  <span className="order__client">
                    <span className="strong">{clientName(o.client_id)}</span>
                    <span className="muted small"> · {formatDate(o.created_at)}</span>
                  </span>
                  <StatusBadge status={o.status} />
                  <span className="order__count muted small">{o.items.length} items</span>
                  <span className="order__total strong">{formatMoney(o.total_amount)}</span>
                  <Icon name="chevron" size={16} className={expanded === o.id ? 'rot' : ''} />
                </button>

                {expanded === o.id && (
                  <div className="order__items">
                    <table className="table table--inner">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th className="num">Price</th>
                          <th className="num">Qty</th>
                          <th className="num">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.items.map((it) => (
                          <tr key={it.id}>
                            <td>{it.product_name ?? `#${it.product_id}`}</td>
                            <td className="num mono">{formatMoney(it.unit_price)}</td>
                            <td className="num">{it.quantity}</td>
                            <td className="num mono strong">{formatMoney(it.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
