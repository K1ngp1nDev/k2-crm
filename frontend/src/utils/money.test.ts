import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('formats a numeric string with two decimals', () => {
    expect(formatMoney('30')).toMatch(/30[.,]00/)
  })

  it('formats a number with grouping', () => {
    expect(formatMoney(1234.5)).toMatch(/1[\s,]?234[.,]50/)
  })

  it('returns a dash for invalid input', () => {
    expect(formatMoney('not-a-number')).toBe('—')
  })
})
