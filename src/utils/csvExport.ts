import type { CurrencyCode, PlannerState, Scenario } from '../types'
import {
  buildSummariesForScenario,
  resolveAmounts,
  roundCents,
  splitExpenses,
} from './calculations'
import { formatMargin } from './formatMoney'

function escapeCsvCell(value: string | number): string {
  const raw = String(value)
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

function uniqueColumnName(base: string, used: Map<string, number>): string {
  const count = used.get(base) ?? 0
  used.set(base, count + 1)
  if (count === 0) return base
  return `${base} (${count + 1})`
}

export function buildActiveScenarioCsv(state: PlannerState, scenario: Scenario): string {
  const summaries = buildSummariesForScenario(
    scenario,
    state.startMonth,
    state.startYear,
    state.startingCash,
  )
  const { cogs, operating } = splitExpenses(scenario.expenses)

  const usedNames = new Map<string, number>()
  const revenueCols = scenario.revenue.map((r) =>
    uniqueColumnName(`Revenue: ${r.name || 'Untitled'}`, usedNames),
  )
  const cogsCols = cogs.map((e) =>
    uniqueColumnName(`COGS: ${e.name || 'Untitled'}`, usedNames),
  )
  const opexCols = operating.map((e) =>
    uniqueColumnName(`Expense: ${e.name || 'Untitled'}`, usedNames),
  )

  const headers = [
    'Month',
    ...revenueCols,
    'Total revenue',
    ...cogsCols,
    'Total COGS',
    'Gross profit',
    'Gross margin',
    ...opexCols,
    'Operating expenses',
    'Total expenses',
    'Net profit',
    'Net margin',
    'Ending cash',
  ]

  const revenueSeries = scenario.revenue.map((r) => resolveAmounts(r))
  const cogsSeries = cogs.map((e) => resolveAmounts(e))
  const opexSeries = operating.map((e) => resolveAmounts(e))

  const rows = summaries.map((summary, i) => {
    const cells: Array<string | number> = [summary.label]
    for (const series of revenueSeries) cells.push(roundCents(series[i]))
    cells.push(summary.revenue)
    for (const series of cogsSeries) cells.push(roundCents(series[i]))
    cells.push(summary.cogs)
    cells.push(summary.grossProfit)
    cells.push(formatMargin(summary.grossMargin))
    for (const series of opexSeries) cells.push(roundCents(series[i]))
    cells.push(summary.operatingExpenses)
    cells.push(summary.expenses)
    cells.push(summary.net)
    cells.push(formatMargin(summary.netMargin))
    cells.push(summary.cumulative)
    return cells.map(escapeCsvCell).join(',')
  })

  // UTF-8 BOM helps Excel recognize encoding
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

export type { CurrencyCode }
