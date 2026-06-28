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

  return (
    <div className="split">
      <div className="split__aside">
        <Card title="New client">
          <form className="form" onSubmit={submit}>
            <Field label="Company / name" required htmlFor="c-name">
              <input
                id="c-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Northwind Trading Co."
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
                placeholder="ops@northwind.example"
              />
            </Field>
            <Field label="Phone" htmlFor="c-phone">
              <input
                id="c-phone"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 415 555 0142"
              />
            </Field>
            <Button type="submit" loading={saving}>
              <Icon name="plus" size={16} />
              Create client
            </Button>
          </form>
        </Card>
      </div>

      <div className="split__main">
        <Card title="Clients" subtitle={`${clients.length} records`}>
          {loading ? (
            <div className="center">
              <Spinner size={26} />
            </div>
          ) : clients.length === 0 ? (
            <EmptyState
              icon="clients"
              title="No clients yet"
              description="Add your first client in the form on the left."
            />
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
