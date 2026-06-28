import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiRequestError } from '../api/client'
import type { Product } from '../api/types'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/format'

export function ProductsView() {
  const toast = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')

  const load = () => {
    setLoading(true)
    api
      .listProducts()
      .then(setProducts)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const created = await api.createProduct({
        name,
        sku: sku || null,
        price,
      })
      toast.success(`Product “${created.name}” created`)
      setName('')
      setSku('')
      setPrice('')
      load()
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Could not create the product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="split">
      <div className="split__aside">
        <Card title="New product">
          <form className="form" onSubmit={submit}>
            <Field label="Name" required htmlFor="p-name">
              <input
                id="p-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ProBook 14&quot; Laptop"
                required
              />
            </Field>
            <Field label="SKU" htmlFor="p-sku">
              <input
                id="p-sku"
                className="input"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="NB-PRO-14"
              />
            </Field>
            <Field label="Price, $" required htmlFor="p-price" hint="Greater than zero">
              <input
                id="p-price"
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1299.00"
                required
              />
            </Field>
            <Button type="submit" loading={saving}>
              <Icon name="plus" size={16} />
              Create product
            </Button>
          </form>
        </Card>
      </div>

      <div className="split__main">
        <Card title="Products" subtitle={`${products.length} items`}>
          {loading ? (
            <div className="center">
              <Spinner size={26} />
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon="products"
              title="No products yet"
              description="Add your first catalog item on the left."
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>SKU</th>
                    <th className="num">Price</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">#{p.id}</td>
                      <td className="strong">{p.name}</td>
                      <td className="mono">{p.sku ?? '—'}</td>
                      <td className="num strong">{formatMoney(p.price)}</td>
                      <td className="muted">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
