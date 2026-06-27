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
import { StatusBadge } from '../components/Badge'
import { useToast } from '../components/Toast'
import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/format'

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
        aria-label="Зменшити"
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
        aria-label="Збільшити"
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
  const [ready, setReady] = useState(false)

  const [clientId, setClientId] = useState<number | ''>('')
  const [lines, setLines] = useState<Line[]>([])
  const [saving, setSaving] = useState(false)
  const lineKey = useRef(0)
  const reqId = useRef(0)

  const [filterId, setFilterId] = useState<number | ''>('')
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([api.listClients(), api.listProducts()])
      .then(([c, p]) => {
        setClients(c)
        setProducts(p)
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setReady(true))
  }, [toast])

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  )

  const previewTotal = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + Number(productById.get(l.product_id)?.price ?? 0) * l.quantity,
        0,
      ),
    [lines, productById],
  )

  const addLine = () => {
    if (products.length === 0) return
    lineKey.current += 1
    setLines((ls) => [...ls, { key: lineKey.current, product_id: products[0].id, quantity: 1 }])
  }

  const updateLine = (key: number, patch: Partial<Omit<Line, 'key'>>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const removeLine = (key: number) => setLines((ls) => ls.filter((l) => l.key !== key))

  const loadOrders = (cid: number) => {
    // Guard against out-of-order responses when the filter changes quickly.
    const token = ++reqId.current
    setOrdersLoading(true)
    api
      .listClientOrders(cid)
      .then((data) => {
        if (token === reqId.current) setOrders(data)
      })
      .catch((e) => {
        if (token === reqId.current) toast.error(e.message)
      })
      .finally(() => {
        if (token === reqId.current) setOrdersLoading(false)
      })
  }

  const onFilterChange = (value: string) => {
    const cid = value === '' ? '' : Number(value)
    setFilterId(cid)
    setExpanded(null)
    if (cid === '') setOrders([])
    else loadOrders(cid)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (clientId === '') {
      toast.error('Оберіть клієнта')
      return
    }
    if (lines.length === 0) {
      toast.error('Додайте хоча б один товар')
      return
    }
    setSaving(true)
    try {
      const order = await api.createOrder({
        client_id: clientId,
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      })
      toast.success(`Замовлення #${order.id} створено — ${formatMoney(order.total_amount)}`)
      setLines([])
      setExpanded(null)
      setFilterId(clientId)
      loadOrders(clientId)
    } catch (err) {
      toast.error(
        err instanceof ApiRequestError ? err.message : 'Не вдалося створити замовлення',
      )
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
            Щоб створити замовлення, спершу додайте хоча б одного{' '}
            <strong>клієнта</strong> та один <strong>товар</strong> у відповідних розділах.
          </span>
        </div>
      )}

      <form className="order-builder" onSubmit={submit}>
        <Card title="Нове замовлення" className="order-builder__form">
          <Field label="Клієнт" required htmlFor="o-client">
            <select
              id="o-client"
              className="select"
              value={clientId}
              onChange={(e) => setClientId(e.target.value === '' ? '' : Number(e.target.value))}
              required
            >
              <option value="">— Оберіть клієнта —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="lines">
            <div className="lines__head">
              <span>Позиції замовлення</span>
              <Button type="button" variant="ghost" size="sm" onClick={addLine} disabled={products.length === 0}>
                <Icon name="plus" size={16} />
                Додати позицію
              </Button>
            </div>

            {lines.length === 0 ? (
              <p className="lines__empty muted small">Додайте хоча б одну позицію.</p>
            ) : (
              lines.map((line, idx) => {
                const product = productById.get(line.product_id)
                const lineTotal = Number(product?.price ?? 0) * line.quantity
                return (
                  <div className="line" key={line.key}>
                    <select
                      className="select line__product"
                      value={line.product_id}
                      aria-label={`Товар, позиція ${idx + 1}`}
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
                      label={`Кількість, позиція ${idx + 1}`}
                      onChange={(q) => updateLine(line.key, { quantity: q })}
                    />

                    <span className="line__total mono">{formatMoney(lineTotal)}</span>

                    <button
                      type="button"
                      className="line__remove"
                      onClick={() => removeLine(line.key)}
                      aria-label="Видалити позицію"
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
          <h3 className="summary__title">Підсумок</h3>
          <div className="summary__lines">
            {lines.length === 0 ? (
              <p className="muted small">Підсумок з’явиться після додавання товарів.</p>
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
            <span>Разом</span>
            <span className="summary__amount">{formatMoney(previewTotal)}</span>
          </div>

          <p className="summary__note">
            Остаточну суму рахує сервер при створенні — це попередній перегляд.
          </p>

          <Button
            type="submit"
            loading={saving}
            disabled={clientId === '' || lines.length === 0}
          >
            Створити замовлення
          </Button>

          {(clientId === '' || lines.length === 0) && (
            <p className="summary__note">
              Оберіть клієнта та додайте хоча б одну позицію.
            </p>
          )}
        </aside>
      </form>

      <Card
        title="Замовлення клієнта"
        action={
          <select
            className="select select--inline"
            value={filterId}
            onChange={(e) => onFilterChange(e.target.value)}
            aria-label="Фільтр за клієнтом"
          >
            <option value="">— Оберіть клієнта —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        }
      >
        {filterId === '' ? (
          <EmptyState
            icon="clients"
            title="Оберіть клієнта"
            description="Виберіть клієнта вгорі, щоб переглянути його замовлення."
          />
        ) : ordersLoading ? (
          <div className="center">
            <Spinner size={26} />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon="orders"
            title="У цього клієнта ще немає замовлень"
            description="Створіть перше замовлення у формі вище."
          />
        ) : (
          <div className="orders">
            {orders.map((o) => (
              <div className="order" key={o.id}>
                <button
                  type="button"
                  className="order__head"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  aria-expanded={expanded === o.id}
                >
                  <span className="order__id mono">#{o.id}</span>
                  <span className="order__date muted">{formatDate(o.created_at)}</span>
                  <StatusBadge status={o.status} />
                  <span className="order__count muted small">{o.items.length} поз.</span>
                  <span className="order__total strong">{formatMoney(o.total_amount)}</span>
                  <Icon name="chevron" size={16} className={expanded === o.id ? 'rot' : ''} />
                </button>

                {expanded === o.id && (
                  <div className="order__items">
                    <table className="table table--inner">
                      <thead>
                        <tr>
                          <th>Товар</th>
                          <th className="num">Ціна</th>
                          <th className="num">К-сть</th>
                          <th className="num">Сума</th>
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
