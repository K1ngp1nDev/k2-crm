import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Badge, StatusBadge } from './Badge'

describe('Badge', () => {
  it('renders the provided text', () => {
    const { container } = render(<Badge tone="success">Готово</Badge>)
    expect(container.textContent).toContain('Готово')
  })

  it('maps a known order status to a localised label', () => {
    const { container } = render(<StatusBadge status="created" />)
    expect(container.textContent).toContain('Створено')
  })
})
