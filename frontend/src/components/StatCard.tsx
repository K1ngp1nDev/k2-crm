import type { IconName } from './Icon'
import { Icon } from './Icon'

interface StatCardProps {
  icon: IconName
  label: string
  value: string | number
  tone?: 'primary' | 'accent' | 'success' | 'info'
  delta?: { value: string; direction: 'up' | 'down' }
}

export function StatCard({ icon, label, value, tone = 'primary', delta }: StatCardProps) {
  return (
    <div className={`stat stat--${tone}`}>
      <div className="stat__icon">
        <Icon name={icon} size={22} />
      </div>
      <div className="stat__body">
        <div className="stat__value-row">
          <span className="stat__value">{value}</span>
          {delta && (
            <span className={`stat__delta stat__delta--${delta.direction}`}>
              <Icon name={delta.direction === 'up' ? 'trend' : 'trend'} size={13} />
              {delta.value}
            </span>
          )}
        </div>
        <span className="stat__label">{label}</span>
      </div>
    </div>
  )
}
