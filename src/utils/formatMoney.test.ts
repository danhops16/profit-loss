import { describe, expect, it } from 'vitest'
import { formatMargin, formatMoney, formatMoneyDetailed } from './formatMoney'

describe('formatMoney', () => {
  it('formats by currency without converting amounts', () => {
    expect(formatMoney(1000, 'USD')).toMatch(/1,000|1000/)
    expect(formatMoney(1000, 'EUR')).toBeTruthy()
    expect(formatMoneyDetailed(10.5, 'GBP')).toBeTruthy()
  })

  it('uses an em dash for null/non-finite margins', () => {
    expect(formatMargin(null)).toBe('—')
    expect(formatMargin(Number.NaN)).toBe('—')
    expect(formatMargin(0.255)).toBe('25.5%')
  })
})
