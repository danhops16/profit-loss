import type { CurrencyCode } from '../types'

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function formatMoney(
  value: number,
  currency: CurrencyCode,
  detailed = false,
): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: detailed ? 0 : 0,
    maximumFractionDigits: detailed ? 2 : 0,
  }).format(finiteOrZero(value))
}

export function formatMoneyDetailed(value: number, currency: CurrencyCode): string {
  return formatMoney(value, currency, true)
}

/** Margin as percent string, or em dash when undefined (e.g. zero revenue). */
export function formatMargin(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return '—'
  return `${(ratio * 100).toFixed(1)}%`
}
