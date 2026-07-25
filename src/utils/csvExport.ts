import type { PlannerState, Scenario } from '../types'
import {
  buildSummariesForScenario,
  resolveAmounts,
  roundCents,
  buildRevenueContext,
} from './calculations'

function escapeCsvCell(value: string | number): string {
  const raw = String(value)
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

function uniqueColumnName(base: string, used: Map<string, number>): string {
  const count = used.get(base) ?? 0
  used.set(base, count + 1)
  return count === 0 ? base : `${base} (${count + 1})`
}

export function buildActiveScenarioCsv(state: PlannerState, scenario: Scenario): string {
  const summaries = buildSummariesForScenario(
    scenario,
    state.startMonth,
    state.startYear,
    state.openingFunds,
    state.cashBuffer,
  )
  const context = buildRevenueContext(scenario.revenue)
  const usedNames = new Map<string, number>()

  const revenueCols = scenario.revenue.map((r) =>
    uniqueColumnName(`Revenue: ${r.name || 'Untitled'}`, usedNames),
  )
  const expenseCols = scenario.expenses.map((e) =>
    uniqueColumnName(`Cost: ${e.name || 'Untitled'}`, usedNames),
  )
  const fundingCols = scenario.funding.map((f) =>
    uniqueColumnName(`Funding: ${f.name || 'Untitled'}`, usedNames),
  )

  const headers = [
    'Month',
    ...revenueCols,
    'Total revenue',
    ...expenseCols,
    'Direct costs',
    'Ongoing costs',
    'Operating profit',
    'Startup spending',
    'Loan payments',
    'Other outflows',
    ...fundingCols,
    'Additional funding',
    'Net cash change',
    'Ending cash',
    'Buffer gap',
  ]

  const revenueSeries = scenario.revenue.map((r) => resolveAmounts(r, context))
  const expenseSeries = scenario.expenses.map((e) => resolveAmounts(e, context))
  const fundingSeries = scenario.funding.map((f) => resolveAmounts(f, context))

  const rows = summaries.map((summary, i) => {
    const cells: Array<string | number> = [summary.label]
    for (const series of revenueSeries) cells.push(roundCents(series[i]))
    cells.push(summary.revenue)
    for (const series of expenseSeries) cells.push(roundCents(series[i]))
    cells.push(summary.directCosts)
    cells.push(summary.operatingCosts)
    cells.push(summary.operatingProfit)
    cells.push(summary.startupSpending)
    cells.push(summary.loanPayments)
    cells.push(summary.otherOutflows)
    for (const series of fundingSeries) cells.push(roundCents(series[i]))
    cells.push(summary.additionalFunding)
    cells.push(summary.netCashChange)
    cells.push(summary.endingCash)
    cells.push(summary.bufferGap)
    return cells.map(escapeCsvCell).join(',')
  })

  return `\uFEFF${headers.map(escapeCsvCell).join(',')}\n${rows.join('\n')}\n`
}

export function csvFilename(state: PlannerState, scenario: Scenario): string {
  const biz = state.businessName.replace(/\s+/g, '-').toLowerCase() || 'planner'
  const scen = scenario.name.replace(/\s+/g, '-').toLowerCase() || 'scenario'
  const start = `${state.startYear}-${String(state.startMonth + 1).padStart(2, '0')}`
  return `${biz}-${scen}-${start}.csv`
}

export function downloadTextFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
