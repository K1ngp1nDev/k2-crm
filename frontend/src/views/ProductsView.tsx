import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiRequestError } from '../api/client'
import type { Product } from '../api/types'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatMoney } from '../utils/money'

const STOCK_TONE: Record<Product['stock_status'], 'success' | 'accent' | 'danger'> = {
  OK: 'success',
  'Low stock': 'accent',
  'Out of stock': 'danger',
}

export function ProductsView() {
  const toast = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('General')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')

  const [search, setSearch] = useState('')
  const [view, setView] = useState<'all' | 'low' | 'out' | 'best'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [selected, setSelected] = useState<Product | null>(null)
  const [newStock, setNewStock] = useState(0)
  const [adjusting, setAdjusting] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .listProducts()
      .then(setProducts)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = products.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (view === 'low' && p.stock_status !== 'Low stock') return false
      if (view === 'out' && p.stock_status !== 'Out of stock') return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
    })
    if (view === 'best') list = [...list].sort((a, b) => b.stock - a.stock)
    return list
  }, [products, search, view, categoryFilter])

  const openProduct = (p: Product) => {
    setSelected(p)
    setNewStock(p.stock)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const created = await api.createProduct({ name, sku: sku || null, category: category || 'General', price, stock: Number(stock) || 0 })
      toast.success(`Product “${created.name}” created`)
      setName('')
      setSku('')
      setPrice('')
      setStock('0')
      load()
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not create the product')
    } finally {
      setSaving(false)
    }
  }

  const saveStock = async () => {
    if (!selected) return
    setAdjusting(true)
    try {
      const updated = await api.adjustStock(selected.id, newStock)
      setProducts((list) => list.map((p) => (p.id === updated.id ? updated : p)))
      setSelected(updated)
      toast.success(`Stock updated — ${updated.name}: ${updated.stock} units`)
    } catch {
      toast.error('Could not update stock')
    } finally {
      setAdjusting(false)
    }
  }

  return (
    <div className="stack">
      <div className="split">
        <div className="split__aside">
          <Card title="New product">
            <form className="form" onSubmit={submit}>
              <Field label="Name" required htmlFor="p-name">
                <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder='ProBook 14" Laptop' required />
              </Field>
              <Field label="SKU" htmlFor="p-sku">
                <input id="p-sku" className="input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="NB-PRO-14" />
              </Field>
              <Field label="Category" htmlFor="p-cat">
                <input id="p-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Laptops" />
              </Field>
              <Field label="Price, $" required htmlFor="p-price" hint="Greater than zero">
                <input id="p-price" className="input" type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1299.00" required />
              </Field>
              <Field label="Initial stock" htmlFor="p-stock">
                <input id="p-stock" className="input" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
              </Field>
              <Button type="submit" loading={saving}>
                <Icon name="plus" size={16} />
                Create product
              </Button>
            </form>
          </Card>
        </div>

        <div className="split__main">
          <Card
            title="Inventory"
            subtitle={`${filtered.length} of ${products.length} SKUs`}
            action={
              <div className="toolbar">
                <div className="search">
                  <Icon name="search" size={16} />
                  <input className="search__input" placeholder="Search name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
                </div>
                <select className="select select--inline" value={view} onChange={(e) => setView(e.target.value as typeof view)} aria-label="View">
                  <option value="all">All stock</option>
                  <option value="low">Low stock</option>
                  <option value="out">Out of stock</option>
                  <option value="best">Best stocked</option>
                </select>
                <select className="select select--inline" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Category">
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            }
          >
            {loading ? (
              <div className="center"><Spinner size={26} /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon="products" title="No products" description="Adjust filters or add a product on the left." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th className="num">Price</th>
                      <th className="num">Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} onClick={() => openProduct(p)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{p.sku ?? '—'}</td>
                        <td className="strong">{p.name}</td>
                        <td className="muted">{p.category}</td>
                        <td className="num strong">{formatMoney(p.price)}</td>
                        <td className="num">{p.stock}</td>
                        <td><Badge tone={STOCK_TONE[p.stock_status]}>{p.stock_status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={selected !== null}
        title={selected?.name ?? ''}
        subtitle={selected ? `${selected.sku ?? '—'} · ${selected.category}` : undefined}
        onClose={() => setSelected(null)}
        footer={
          <Button loading={adjusting} onClick={saveStock} disabled={!selected || newStock === selected.stock}>
            <Icon name="check" size={16} />
            Save stock
          </Button>
        }
      >
        {selected && (
          <div className="stack">
            <div className="kv">
              <div>
                <p className="kv__label">Catalog price</p>
                <p className="kv__value">{formatMoney(selected.price)}</p>
              </div>
              <div>
                <p className="kv__label">Stock status</p>
                <p className="kv__value"><Badge tone={STOCK_TONE[selected.stock_status]}>{selected.stock_status}</Badge></p>
              </div>
              <div>
                <p className="kv__label">Reorder threshold</p>
                <p className="kv__value">{selected.reorder_threshold} units</p>
              </div>
              <div>
                <p className="kv__label">Inventory value</p>
                <p className="kv__value">{formatMoney(Number(selected.price) * selected.stock)}</p>
              </div>
            </div>

            <div>
              <p className="field__label" style={{ marginBottom: 6 }}>Adjust stock</p>
              <div className="qty" style={{ width: 'fit-content' }}>
                <button type="button" className="qty__btn" onClick={() => setNewStock((n) => Math.max(0, n - 1))} aria-label="Decrease">
                  <Icon name="minus" size={14} />
                </button>
                <input
                  className="qty__input"
                  type="number"
                  min={0}
                  value={newStock}
                  onChange={(e) => setNewStock(Math.max(0, Math.floor(Number(e.target.value)) || 0))}
                  aria-label="New stock level"
                  style={{ width: 64 }}
                />
                <button type="button" className="qty__btn" onClick={() => setNewStock((n) => n + 1)} aria-label="Increase">
                  <Icon name="plus" size={14} />
                </button>
              </div>
              <p className="summary__note" style={{ marginTop: 6 }}>
                Recommended reorder when stock ≤ {selected.reorder_threshold}.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
