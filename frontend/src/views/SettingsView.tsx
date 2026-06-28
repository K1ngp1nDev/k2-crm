import { useState } from 'react'
import { api } from '../api/client'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'

export function SettingsView() {
  const toast = useToast()
  const [profile, setProfile] = useState({
    company: 'K2 Trading Co.',
    email: 'ops@k2erp.example',
    address: '14 Market Street, Kyiv',
    timezone: 'Europe/Kyiv',
  })
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD')
  const [taxRate, setTaxRate] = useState('20')
  const [resetting, setResetting] = useState(false)

  const saveProfile = () => toast.success('Business profile saved (demo)')

  const resetDemo = async () => {
    if (!window.confirm('Reset all demo data back to the seeded state?')) return
    setResetting(true)
    try {
      await api.resetDemo()
      toast.success('Demo data has been reset to the seeded state')
    } catch {
      toast.error('Could not reset demo data')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="split">
      <div className="split__aside">
        <Card title="Display preferences">
          <div className="stack">
            <div>
              <p className="field__label" style={{ marginBottom: 6 }}>Currency display</p>
              <div className="seg">
                {(['USD', 'EUR', 'GBP'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={currency === c ? 'is-active' : ''}
                    onClick={() => {
                      setCurrency(c)
                      toast.push('info', `Currency display set to ${c} (demo)`)
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Default tax rate, %" htmlFor="s-tax" hint="Shown on invoices (demo)">
              <input
                id="s-tax"
                className="input"
                type="number"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card title="Demo controls">
          <p className="muted small" style={{ marginBottom: 12 }}>
            Restore the database to its deterministic seeded state. Useful before a fresh walkthrough.
          </p>
          <Button variant="danger" loading={resetting} onClick={resetDemo}>
            <Icon name="trash" size={16} />
            Reset demo data
          </Button>
        </Card>
      </div>

      <div className="split__main">
        <Card title="Business profile">
          <form className="form" onSubmit={(e) => { e.preventDefault(); saveProfile() }}>
            <Field label="Company name" htmlFor="s-company">
              <input id="s-company" className="input" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
            </Field>
            <Field label="Contact email" htmlFor="s-email">
              <input id="s-email" className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </Field>
            <Field label="Address" htmlFor="s-addr">
              <input id="s-addr" className="input" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            </Field>
            <Field label="Timezone" htmlFor="s-tz">
              <input id="s-tz" className="input" value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} />
            </Field>
            <Button type="submit">
              <Icon name="check" size={16} />
              Save profile
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
