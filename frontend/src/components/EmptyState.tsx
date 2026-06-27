import type { IconName } from './Icon'
import { Icon } from './Icon'

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
}

export function EmptyState({ icon = 'inbox', title, description }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon name={icon} size={28} />
      </div>
      <p className="empty__title">{title}</p>
      {description && <p className="empty__desc">{description}</p>}
    </div>
  )
}
