import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Badge, StatusBadge } from './Badge'

describe('Badge', () => {
  it('renders the provided text', () => {
    const { container } = render(<Badge tone="success">Done</Badge>)
    expect(container.textContent).toContain('Done')
  })

  it('maps a known order status to a readable label', () => {
    const { container } = render(<StatusBadge status="created" />)
    expect(container.textContent).toContain('Created')
  })
})
