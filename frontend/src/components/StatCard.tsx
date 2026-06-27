import type { IconName } from './Icon'
import { Icon } from './Icon'

interface StatCardProps {
  icon: IconName
  label: string
  value: string | number
  tone?: 'primary' | 'accent' | 'success' | 'info'
}

export function StatCard({ icon, label, value, tone = 'primary' }: StatCardProps) {
  return (
    <div className={`stat stat--${tone}`}>
      <div className="stat__icon">
        <Icon name={icon} size={22} />
      </div>
      <div className="stat__body">
        <span className="stat__value">{value}</span>
        <span className="stat__label">{label}</span>
      </div>
    </div>
  )
}
