import type { LineItem, MonthSummary, PlannerState } from '../types'
import { MONTHS } from '../types'

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function roundCents(value: number): number {
  return Math.round(finiteOrZero(value) * 100) / 100
}

export function resolveAmounts(item: LineItem): number[] {
  const uniformAmount = finiteOrZero(item.uniformAmount)
  const growthPercent = finiteOrZero(item.growthPercent)

  if (item.fillMode === 'uniform') {
    return Array.from({ length: 12 }, () => uniformAmount)
  }

  if (item.fillMode === 'growth') {
    const result: number[] = []
    let value = uniformAmount
    for (let i = 0; i < 12; i++) {
      result.push(roundCents(value))
      value *= 1 + growthPercent / 100
      if (!Number.isFinite(value)) value = 0
    }
    return result
  }

  // manual (and any unexpected fillMode)
  const amounts = Array.isArray(item.amounts) ? item.amounts : []
  return Array.from({ length: 12 }, (_, i) => finiteOrZero(amounts[i] ?? 0))
}

export function sumLineItems(items: LineItem[]): number[] {
  const totals = Array.from({ length: 12 }, () => 0)
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

/** Calendar labels for the 12 forecast months (handles year rollover). */
export function forecastMonthLabels(startMonth: number, startYear: number): string[] {
  const month = Number.isFinite(startMonth) ? Math.trunc(startMonth) : 0
  const year = Number.isFinite(startYear) ? Math.trunc(startYear) : new Date().getFullYear()
  const safeMonth = ((month % 12) + 12) % 12

  return Array.from({ length: 12 }, (_, i) => {
    const monthIndex = (safeMonth + i) % 12
    const labelYear = year + Math.floor((safeMonth + i) / 12)
    return monthLabel(monthIndex, labelYear)
  })
}

export function buildSummaries(state: PlannerState): MonthSummary[] {
  const revenueByMonth = sumLineItems(state.revenue)
  const expensesByMonth = sumLineItems(state.expenses)
  let cumulative = finiteOrZero(state.startingCash)
  const labels = forecastMonthLabels(state.startMonth, state.startYear)

  return Array.from({ length: 12 }, (_, i) => {
    const revenue = roundCents(revenueByMonth[i])
    const expenses = roundCents(expensesByMonth[i])
    const net = roundCents(revenue - expenses)
    cumulative = roundCents(cumulative + net)

    return {
      label: labels[i],
      revenue,
      expenses,
      net,
      cumulative,
    }
  })
}

export interface PlannerMetrics {
  totalRevenue: number
  totalExpenses: number
  yearNet: number
  endingCash: number
  lowestCash: number
  monthsAtLoss: number
  /** First month where net > 0; null if none. */
  firstProfitableMonthLabel: string | null
  /** Mean of |net| for months with net < 0; 0 if none. */
  averageMonthlyLoss: number
  /**
   * Runway:
   * - "Already negative" if starting cash < 0
   * - month label of first ending cash < 0
   * - "12+ months" if cash stays non-negative
   */
  runwayLabel: string
}

export function buildMetrics(
  summaries: MonthSummary[],
  startingCash: number,
): PlannerMetrics {
  const totalRevenue = roundCents(summaries.reduce((s, m) => s + m.revenue, 0))
  const totalExpenses = roundCents(summaries.reduce((s, m) => s + m.expenses, 0))
  const yearNet = roundCents(totalRevenue - totalExpenses)
  const endingCash =
    summaries.length > 0
      ? summaries[summaries.length - 1].cumulative
      : finiteOrZero(startingCash)

  const cashPoints = [finiteOrZero(startingCash), ...summaries.map((m) => m.cumulative)]
  const lowestCash = Math.min(...cashPoints)

  const lossMonths = summaries.filter((m) => m.net < 0)
  const monthsAtLoss = lossMonths.length
  const averageMonthlyLoss =
    monthsAtLoss > 0
      ? roundCents(
          Math.abs(lossMonths.reduce((s, m) => s + m.net, 0) / monthsAtLoss),
        )
      : 0

  const firstProfit = summaries.find((m) => m.net > 0)
  const firstProfitableMonthLabel = firstProfit ? firstProfit.label : null

  let runwayLabel: string
  if (finiteOrZero(startingCash) < 0) {
    runwayLabel = 'Already negative'
  } else {
    const firstNegative = summaries.find((m) => m.cumulative < 0)
    runwayLabel = firstNegative ? firstNegative.label : '12+ months'
  }

  return {
    totalRevenue,
    totalExpenses,
    yearNet,
    endingCash,
    lowestCash,
    monthsAtLoss,
    firstProfitableMonthLabel,
    averageMonthlyLoss,
    runwayLabel,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(finiteOrZero(value))
}

export function formatCurrencyDetailed(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(finiteOrZero(value))
}
