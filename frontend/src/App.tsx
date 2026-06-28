import { useEffect, useState } from 'react'
import type { IconName } from './components/Icon'
import { Icon } from './components/Icon'
import { DashboardView } from './views/DashboardView'
import { ClientsView } from './views/ClientsView'
import { ProductsView } from './views/ProductsView'
import { OrdersView } from './views/OrdersView'

export type View = 'dashboard' | 'clients' | 'products' | 'orders'

interface NavItem {
  id: View
  label: string
  icon: IconName
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
  { id: 'clients', label: 'Clients', icon: 'clients' },
  { id: 'products', label: 'Products', icon: 'products' },
  { id: 'orders', label: 'Orders', icon: 'orders' },
]

const TITLES: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Overview', subtitle: 'Key metrics for the order accounting module' },
  clients: { title: 'Clients', subtitle: 'Company client directory' },
  products: { title: 'Products', subtitle: 'Product and service catalog' },
  orders: {
    title: 'Orders',
    subtitle: 'Build orders and browse the full order history',
  },
}

type ThemePref = 'light' | 'dark' | null

function useTheme() {
  const [pref, setPref] = useState<ThemePref>(() => {
    const stored = localStorage.getItem('k2-theme')
    return stored === 'light' || stored === 'dark' ? stored : null
  })
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (pref) {
      root.setAttribute('data-theme', pref)
      localStorage.setItem('k2-theme', pref)
    } else {
      root.removeAttribute('data-theme')
      localStorage.removeItem('k2-theme')
    }
  }, [pref])

  const isDark = pref ? pref === 'dark' : systemDark
  return { isDark, toggle: () => setPref(isDark ? 'light' : 'dark') }
}

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const { isDark, toggle } = useTheme()
  const meta = TITLES[view]

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">K2</span>
          <span className="brand__text">
            <strong>K2&nbsp;ERP</strong>
            <span>Order accounting</span>
          </span>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav__item ${view === item.id ? 'nav__item--active' : ''}`.trim()}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => setView(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button type="button" className="theme-toggle" onClick={toggle}>
            <Icon name={isDark ? 'sun' : 'moon'} />
            <span>{isDark ? 'Light theme' : 'Dark theme'}</span>
          </button>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div>
            <h1 className="topbar__title">{meta.title}</h1>
            <p className="topbar__subtitle">{meta.subtitle}</p>
          </div>
        </header>

        <main className="page">
          {view === 'dashboard' && <DashboardView onNavigate={setView} />}
          {view === 'clients' && <ClientsView />}
          {view === 'products' && <ProductsView />}
          {view === 'orders' && <OrdersView />}
        </main>
      </div>
    </div>
  )
}
