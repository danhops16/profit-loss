import type {
  ExpenseLineItem,
  LineItem,
  MonthSummary,
  PlannerState,
  Scenario,
  ScenarioComparisonRow,
} from '../types'
import { MONTHS } from '../types'
import { getActiveScenario } from './defaults'

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function roundCents(value: number): number {
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

  if (item.fillMode === 'one-time') {
    const month = Math.trunc(finiteOrZero(item.oneTimeMonth))
    const safeMonth = month >= 0 && month <= 11 ? month : 0
    return Array.from({ length: 12 }, (_, i) => (i === safeMonth ? uniformAmount : 0))
  }

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

function marginRatio(part: number, revenue: number): number | null {
  if (revenue === 0) return null
  return part / revenue
}

export function splitExpenses(expenses: ExpenseLineItem[]): {
  cogs: ExpenseLineItem[]
  operating: ExpenseLineItem[]
} {
  return {
    cogs: expenses.filter((e) => e.category === 'cogs'),
    operating: expenses.filter((e) => e.category !== 'cogs'),
  }
}

export function buildSummariesForScenario(
  scenario: Scenario,
  startMonth: number,
  startYear: number,
  startingCash: number,
): MonthSummary[] {
  const revenueByMonth = sumLineItems(scenario.revenue)
  const { cogs, operating } = splitExpenses(scenario.expenses)
  const cogsByMonth = sumLineItems(cogs)
  const opexByMonth = sumLineItems(operating)
  let cumulative = finiteOrZero(startingCash)
  const labels = forecastMonthLabels(startMonth, startYear)

  return Array.from({ length: 12 }, (_, i) => {
    const revenue = roundCents(revenueByMonth[i])
    const cogsAmt = roundCents(cogsByMonth[i])
    const operatingExpenses = roundCents(opexByMonth[i])
    const expenses = roundCents(cogsAmt + operatingExpenses)
    const grossProfit = roundCents(revenue - cogsAmt)
    const net = roundCents(grossProfit - operatingExpenses)
    cumulative = roundCents(cumulative + net)

    return {
      label: labels[i],
      revenue,
      cogs: cogsAmt,
      grossProfit,
      grossMargin: marginRatio(grossProfit, revenue),
      operatingExpenses,
      expenses,
      net,
      netMargin: marginRatio(net, revenue),
      cumulative,
    }
  })
}

export function buildSummaries(state: PlannerState): MonthSummary[] {
  const scenario = getActiveScenario(state)
  return buildSummariesForScenario(
    scenario,
    state.startMonth,
    state.startYear,
    state.startingCash,
  )
}

export interface PlannerMetrics {
  totalRevenue: number
  totalCogs: number
  grossProfit: number
  grossMargin: number | null
  operatingExpenses: number
  totalExpenses: number
  yearNet: number
  netMargin: number | null
  endingCash: number
  lowestCash: number
  lowestCashMonthLabel: string | null
  monthsAtLoss: number
  firstProfitableMonthLabel: string | null
  firstNegativeCashMonthLabel: string | null
  /** Mean of |net| for months with net < 0; 0 if none. */
  averageMonthlyLoss: number
  /**
   * Complete forecast months with non-negative ending cash before first negative.
   * null means never goes negative within the forecast (12+).
   */
  runwayMonths: number | null
  runwayLabel: string
}

export function buildMetrics(
  summaries: MonthSummary[],
  startingCash: number,
): PlannerMetrics {
  const totalRevenue = roundCents(summaries.reduce((s, m) => s + m.revenue, 0))
  const totalCogs = roundCents(summaries.reduce((s, m) => s + m.cogs, 0))
  const operatingExpenses = roundCents(
    summaries.reduce((s, m) => s + m.operatingExpenses, 0),
  )
  const totalExpenses = roundCents(summaries.reduce((s, m) => s + m.expenses, 0))
  const grossProfit = roundCents(totalRevenue - totalCogs)
  const yearNet = roundCents(grossProfit - operatingExpenses)
  const endingCash =
    summaries.length > 0
      ? summaries[summaries.length - 1].cumulative
      : finiteOrZero(startingCash)

  let lowestCash = finiteOrZero(startingCash)
  let lowestCashMonthLabel: string | null = null
  for (const m of summaries) {
    if (m.cumulative < lowestCash) {
      lowestCash = m.cumulative
      lowestCashMonthLabel = m.label
    }
  }
  // If starting cash is the lowest and never beaten by a month, leave month null
  // unless a month ties — we prefer the first month that hits the low.
  if (lowestCashMonthLabel === null && summaries.length > 0) {
    const tie = summaries.find((m) => m.cumulative === lowestCash)
    if (tie && tie.cumulative <= finiteOrZero(startingCash)) {
      lowestCashMonthLabel = tie.label
    }
  }

  const lossMonths = summaries.filter((m) => m.net < 0)
  const monthsAtLoss = lossMonths.length
  const averageMonthlyLoss =
    monthsAtLoss > 0
      ? roundCents(Math.abs(lossMonths.reduce((s, m) => s + m.net, 0) / monthsAtLoss))
      : 0

  const firstProfit = summaries.find((m) => m.net > 0)
  const firstProfitableMonthLabel = firstProfit ? firstProfit.label : null

  const firstNegCash = summaries.find((m) => m.cumulative < 0)
  const firstNegativeCashMonthLabel = firstNegCash ? firstNegCash.label : null

  const start = finiteOrZero(startingCash)
  let runwayMonths: number | null
  let runwayLabel: string

  if (start < 0) {
    runwayMonths = 0
    runwayLabel = '0 months — already negative'
  } else if (summaries.length > 0 && summaries[0].cumulative < 0) {
    runwayMonths = 0
    runwayLabel = '0 full months'
  } else {
    const negIndex = summaries.findIndex((m) => m.cumulative < 0)
    if (negIndex === -1) {
      runwayMonths = null
      runwayLabel = '12+ months'
    } else {
      runwayMonths = negIndex
      runwayLabel = `${negIndex} full month${negIndex === 1 ? '' : 's'}`
    }
  }

  // Exactly zero cash: still non-negative — runway continues until < 0
  return {
    totalRevenue,
    totalCogs,
    grossProfit,
    grossMargin: marginRatio(grossProfit, totalRevenue),
    operatingExpenses,
    totalExpenses,
    yearNet,
    netMargin: marginRatio(yearNet, totalRevenue),
    endingCash,
    lowestCash,
    lowestCashMonthLabel,
    monthsAtLoss,
    firstProfitableMonthLabel,
    firstNegativeCashMonthLabel,
    averageMonthlyLoss,
    runwayMonths,
    runwayLabel,
  }
}

export function compareScenarios(state: PlannerState): ScenarioComparisonRow[] {
  return state.scenarios.map((scenario) => {
    const summaries = buildSummariesForScenario(
      scenario,
      state.startMonth,
      state.startYear,
      state.startingCash,
    )
    const metrics = buildMetrics(summaries, state.startingCash)
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      totalRevenue: metrics.totalRevenue,
      grossProfit: metrics.grossProfit,
      grossMargin: metrics.grossMargin,
      totalExpenses: metrics.totalExpenses,
      yearNet: metrics.yearNet,
      netMargin: metrics.netMargin,
      endingCash: metrics.endingCash,
      lowestCash: metrics.lowestCash,
      runwayLabel: metrics.runwayLabel,
      runwayMonths: metrics.runwayMonths,
    }
  })
}

/** @deprecated Prefer formatMoney from formatMoney.ts */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(finiteOrZero(value))
}

/** @deprecated Prefer formatMoneyDetailed from formatMoney.ts */
export function formatCurrencyDetailed(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(finiteOrZero(value))
}
