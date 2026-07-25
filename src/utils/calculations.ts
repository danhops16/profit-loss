import type {
  ExpenseLineItem,
  FundingLineItem,
  LineItem,
  MonthSummary,
  OpeningFundSource,
  PlannerState,
  Scenario,
  ScenarioComparisonRow,
} from '../types'
import { MONTHS } from '../types'
import { getActiveScenario, totalOpeningFunds } from './defaults'

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function roundCents(value: number): number {
  return Math.round(finiteOrZero(value) * 100) / 100
}

export interface AmountContext {
  totalRevenueByMonth: number[]
  revenueByLineId: Record<string, number[]>
}

export function buildRevenueContext(revenue: LineItem[]): AmountContext {
  const revenueByLineId: Record<string, number[]> = {}
  const totalRevenueByMonth = Array.from({ length: 12 }, () => 0)

  for (const item of revenue) {
    // Resolve non-percent modes first for basis; percent-of-revenue revenue lines
    // are unusual — treat them as zero basis to avoid recursion.
    const amounts =
      item.fillMode === 'percent-revenue'
        ? Array.from({ length: 12 }, () => 0)
        : resolveAmountsSimple(item)
    revenueByLineId[item.id] = amounts
    for (let i = 0; i < 12; i++) totalRevenueByMonth[i] += amounts[i]
  }

  return { totalRevenueByMonth, revenueByLineId }
}

function resolveAmountsSimple(item: LineItem): number[] {
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

export function resolveAmounts(item: LineItem, context?: AmountContext): number[] {
  if (item.fillMode === 'percent-revenue') {
    const pct = finiteOrZero(item.percentOfRevenue) / 100
    const basis =
      item.revenueBasisId && context?.revenueByLineId[item.revenueBasisId]
        ? context.revenueByLineId[item.revenueBasisId]
        : (context?.totalRevenueByMonth ?? Array.from({ length: 12 }, () => 0))
    return Array.from({ length: 12 }, (_, i) => roundCents(finiteOrZero(basis[i]) * pct))
  }
  return resolveAmountsSimple(item)
}

export function sumLineItems(items: LineItem[], context?: AmountContext): number[] {
  const totals = Array.from({ length: 12 }, () => 0)
  for (const item of items) {
    const amounts = resolveAmounts(item, context)
    for (let i = 0; i < 12; i++) totals[i] += amounts[i]
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

function byPurpose(expenses: ExpenseLineItem[], purpose: ExpenseLineItem['cashPurpose']) {
  return expenses.filter((e) => e.cashPurpose === purpose)
}

export function buildSummariesForScenario(
  scenario: Scenario,
  startMonth: number,
  startYear: number,
  openingFunds: OpeningFundSource[],
  cashBuffer = 0,
): MonthSummary[] {
  const context = buildRevenueContext(scenario.revenue)
  const revenueByMonth = sumLineItems(scenario.revenue, context)
  const directByMonth = sumLineItems(byPurpose(scenario.expenses, 'direct'), context)
  const operatingByMonth = sumLineItems(byPurpose(scenario.expenses, 'operating'), context)
  const startupByMonth = sumLineItems(byPurpose(scenario.expenses, 'startup'), context)
  const loanByMonth = sumLineItems(byPurpose(scenario.expenses, 'loan_payment'), context)
  const otherOutByMonth = sumLineItems(byPurpose(scenario.expenses, 'other_outflow'), context)
  const fundingByMonth = sumLineItems(scenario.funding ?? [], context)

  let cumulative = roundCents(totalOpeningFunds(openingFunds))
  const labels = forecastMonthLabels(startMonth, startYear)
  const buffer = finiteOrZero(cashBuffer)

  return Array.from({ length: 12 }, (_, i) => {
    const revenue = roundCents(revenueByMonth[i])
    const directCosts = roundCents(directByMonth[i])
    const operatingCosts = roundCents(operatingByMonth[i])
    const startupSpending = roundCents(startupByMonth[i])
    const loanPayments = roundCents(loanByMonth[i])
    const otherOutflows = roundCents(otherOutByMonth[i])
    const additionalFunding = roundCents(fundingByMonth[i])
    const grossContribution = roundCents(revenue - directCosts)
    const operatingProfit = roundCents(grossContribution - operatingCosts)
    const totalOutflows = roundCents(
      directCosts + operatingCosts + startupSpending + loanPayments + otherOutflows,
    )
    const netCashChange = roundCents(revenue + additionalFunding - totalOutflows)
    cumulative = roundCents(cumulative + netCashChange)
    const bufferGap = roundCents(Math.max(0, buffer - cumulative))

    return {
      label: labels[i],
      revenue,
      directCosts,
      grossContribution,
      operatingCosts,
      operatingProfit,
      startupSpending,
      loanPayments,
      otherOutflows,
      additionalFunding,
      totalOutflows,
      netCashChange,
      endingCash: cumulative,
      bufferGap,
    }
  })
}

export function buildSummaries(state: PlannerState): MonthSummary[] {
  return buildSummariesForScenario(
    getActiveScenario(state),
    state.startMonth,
    state.startYear,
    state.openingFunds,
    state.cashBuffer,
  )
}

export interface PlannerMetrics {
  totalOpeningFunds: number
  cashAfterMonthOne: number
  lowestCash: number
  lowestCashMonthLabel: string | null
  endingCash: number
  personalFundingRequired: number
  personalFundingFirstMonthLabel: string | null
  monthsBelowBuffer: number
  firstNegativeCashMonthLabel: string | null
  runwayMonths: number | null
  runwayLabel: string
  totalRevenue: number
  totalDirectCosts: number
  totalOperatingCosts: number
  totalStartupSpending: number
  totalLoanPayments: number
  totalOtherOutflows: number
  totalAdditionalFunding: number
  operatingProfit: number
  firstProfitableOperatingMonthLabel: string | null
  averageMonthlyOperatingLoss: number
  monthsOperatingAtLoss: number
}

export function buildMetrics(
  summaries: MonthSummary[],
  openingFunds: OpeningFundSource[],
  cashBuffer = 0,
): PlannerMetrics {
  const totalOpeningFundsAmt = roundCents(totalOpeningFunds(openingFunds))
  const buffer = finiteOrZero(cashBuffer)
  const cashAfterMonthOne =
    summaries.length > 0 ? summaries[0].endingCash : totalOpeningFundsAmt
  const endingCash =
    summaries.length > 0
      ? summaries[summaries.length - 1].endingCash
      : totalOpeningFundsAmt

  let lowestCash = totalOpeningFundsAmt
  let lowestCashMonthLabel: string | null = null
  for (const m of summaries) {
    if (m.endingCash < lowestCash) {
      lowestCash = m.endingCash
      lowestCashMonthLabel = m.label
    }
  }
  if (lowestCashMonthLabel === null && summaries.length > 0) {
    const tie = summaries.find((m) => m.endingCash === lowestCash)
    if (tie) lowestCashMonthLabel = tie.label
  }

  // Personal funding required from shortfall vs buffer (exact equality is OK)
  const personalFundingRequired = roundCents(Math.max(0, buffer - lowestCash))

  let personalFundingFirstMonthLabel: string | null = null
  if (personalFundingRequired > 0) {
    if (totalOpeningFundsAmt < buffer) {
      personalFundingFirstMonthLabel = 'Before month 1'
    } else {
      const hit = summaries.find((m) => m.endingCash < buffer)
      personalFundingFirstMonthLabel = hit?.label ?? null
    }
  }

  const monthsBelowBuffer = summaries.filter((m) => m.endingCash < buffer).length
  const firstNeg = summaries.find((m) => m.endingCash < 0)
  const firstNegativeCashMonthLabel = firstNeg ? firstNeg.label : null

  let runwayMonths: number | null
  let runwayLabel: string
  if (totalOpeningFundsAmt < 0) {
    runwayMonths = 0
    runwayLabel = '0 months — already negative'
  } else if (summaries.length > 0 && summaries[0].endingCash < 0) {
    runwayMonths = 0
    runwayLabel = '0 full months'
  } else {
    const negIndex = summaries.findIndex((m) => m.endingCash < 0)
    if (negIndex === -1) {
      runwayMonths = null
      runwayLabel = '12+ months'
    } else {
      runwayMonths = negIndex
      runwayLabel = `${negIndex} full month${negIndex === 1 ? '' : 's'}`
    }
  }

  const totalRevenue = roundCents(summaries.reduce((s, m) => s + m.revenue, 0))
  const totalDirectCosts = roundCents(summaries.reduce((s, m) => s + m.directCosts, 0))
  const totalOperatingCosts = roundCents(
    summaries.reduce((s, m) => s + m.operatingCosts, 0),
  )
  const totalStartupSpending = roundCents(
    summaries.reduce((s, m) => s + m.startupSpending, 0),
  )
  const totalLoanPayments = roundCents(summaries.reduce((s, m) => s + m.loanPayments, 0))
  const totalOtherOutflows = roundCents(
    summaries.reduce((s, m) => s + m.otherOutflows, 0),
  )
  const totalAdditionalFunding = roundCents(
    summaries.reduce((s, m) => s + m.additionalFunding, 0),
  )
  const operatingProfit = roundCents(
    summaries.reduce((s, m) => s + m.operatingProfit, 0),
  )

  const firstProfit = summaries.find((m) => m.operatingProfit > 0)
  const lossMonths = summaries.filter((m) => m.operatingProfit < 0)
  const averageMonthlyOperatingLoss =
    lossMonths.length > 0
      ? roundCents(
          Math.abs(lossMonths.reduce((s, m) => s + m.operatingProfit, 0) / lossMonths.length),
        )
      : 0

  return {
    totalOpeningFunds: totalOpeningFundsAmt,
    cashAfterMonthOne,
    lowestCash,
    lowestCashMonthLabel,
    endingCash,
    personalFundingRequired,
    personalFundingFirstMonthLabel,
    monthsBelowBuffer,
    firstNegativeCashMonthLabel,
    runwayMonths,
    runwayLabel,
    totalRevenue,
    totalDirectCosts,
    totalOperatingCosts,
    totalStartupSpending,
    totalLoanPayments,
    totalOtherOutflows,
    totalAdditionalFunding,
    operatingProfit,
    firstProfitableOperatingMonthLabel: firstProfit ? firstProfit.label : null,
    averageMonthlyOperatingLoss,
    monthsOperatingAtLoss: lossMonths.length,
  }
}

export function compareScenarios(state: PlannerState): ScenarioComparisonRow[] {
  return state.scenarios.map((scenario) => {
    const summaries = buildSummariesForScenario(
      scenario,
      state.startMonth,
      state.startYear,
      state.openingFunds,
      state.cashBuffer,
    )
    const metrics = buildMetrics(summaries, state.openingFunds, state.cashBuffer)
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      cashAfterMonthOne: metrics.cashAfterMonthOne,
      lowestCash: metrics.lowestCash,
      lowestCashMonthLabel: metrics.lowestCashMonthLabel,
      personalFundingRequired: metrics.personalFundingRequired,
      firstNegativeCashMonthLabel: metrics.firstNegativeCashMonthLabel,
      endingCash: metrics.endingCash,
      operatingProfit: metrics.operatingProfit,
    }
  })
}

export function modeSummary(
  item: LineItem,
  monthLabels: string[],
  formatMoney: (n: number) => string,
): string {
  switch (item.fillMode) {
    case 'uniform':
      return `${formatMoney(item.uniformAmount)} each month`
    case 'growth':
      return `Starts at ${formatMoney(item.uniformAmount)} · grows ${item.growthPercent}% monthly`
    case 'one-time': {
      const label = monthLabels[item.oneTimeMonth] ?? `Month ${item.oneTimeMonth + 1}`
      return `${formatMoney(item.uniformAmount)} in ${label}`
    }
    case 'percent-revenue':
      return item.revenueBasisId
        ? `${item.percentOfRevenue}% of selected revenue line`
        : `${item.percentOfRevenue}% of total revenue`
    case 'manual':
    default:
      return 'Custom monthly amounts'
  }
}

export type { FundingLineItem, ExpenseLineItem }
