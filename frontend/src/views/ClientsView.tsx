import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiRequestError } from '../api/client'
import type { Client } from '../api/types'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { formatDate } from '../utils/format'

export function ClientsView() {
  const toast = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const load = () => {
    setLoading(true)
    api
      .listClients()
      .then(setClients)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const created = await api.createClient({
        name,
        email: email || null,
        phone: phone || null,
      })
      toast.success(`Клієнта «${created.name}» створено`)
      setName('')
      setEmail('')
      setPhone('')
      load()
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Не вдалося створити клієнта')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="split">
      <div className="split__aside">
        <Card title="Новий клієнт">
          <form className="form" onSubmit={submit}>
            <Field label="Назва / ім'я" required htmlFor="c-name">
              <input
                id="c-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ТОВ «Альфа»"
                required
              />
            </Field>
            <Field label="Email" htmlFor="c-email">
              <input
                id="c-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@alfa.ua"
              />
            </Field>
            <Field label="Телефон" htmlFor="c-phone">
              <input
                id="c-phone"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+380 44 123 45 67"
              />
            </Field>
            <Button type="submit" loading={saving}>
              <Icon name="plus" size={16} />
              Створити клієнта
            </Button>
          </form>
        </Card>
      </div>

      <div className="split__main">
        <Card title="Клієнти" subtitle={`${clients.length} записів`}>
          {loading ? (
            <div className="center">
              <Spinner size={26} />
            </div>
          ) : clients.length === 0 ? (
            <EmptyState
              icon="clients"
              title="Ще немає клієнтів"
              description="Додайте першого клієнта у формі зліва."
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Назва</th>
                    <th>Email</th>
                    <th>Телефон</th>
                    <th>Створено</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
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
    </div>
  )
}
