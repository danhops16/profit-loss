import type { LineItem, MonthSummary, PlannerState } from '../types'
import { MONTHS } from '../types'

export function resolveAmounts(item: LineItem): number[] {
  const amounts = [...item.amounts]
  while (amounts.length < 12) amounts.push(0)

  if (item.fillMode === 'uniform') {
    return Array(12).fill(item.uniformAmount)
  }

  if (item.fillMode === 'growth') {
    const result: number[] = []
    let value = item.uniformAmount
    for (let i = 0; i < 12; i++) {
      result.push(Math.round(value * 100) / 100)
      value *= 1 + item.growthPercent / 100
    }
    return result
  }

  return amounts.slice(0, 12)
}

export function sumLineItems(items: LineItem[]): number[] {
  const totals = Array(12).fill(0)
  for (const item of items) {
    const amounts = resolveAmounts(item)
    for (let i = 0; i < 12; i++) {
      totals[i] += amounts[i]
    }
  }
  return totals
}

export function monthLabel(monthIndex: number, year: number): string {
  return `${MONTHS[monthIndex]} ${year}`
}

export function buildSummaries(state: PlannerState): MonthSummary[] {
  const revenueByMonth = sumLineItems(state.revenue)
  const expensesByMonth = sumLineItems(state.expenses)
  let cumulative = state.startingCash

  return Array.from({ length: 12 }, (_, i) => {
    const monthIndex = (state.startMonth + i) % 12
    const year = state.startYear + Math.floor((state.startMonth + i) / 12)
    const revenue = revenueByMonth[i]
    const expenses = expensesByMonth[i]
    const net = revenue - expenses
    cumulative += net

    return {
      label: monthLabel(monthIndex, year),
      revenue,
      expenses,
      net,
      cumulative: Math.round(cumulative * 100) / 100,
    }
  })
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyDetailed(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}
