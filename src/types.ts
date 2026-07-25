export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export const SCHEMA_VERSION = 2 as const

export type FillMode = 'manual' | 'uniform' | 'growth' | 'one-time'

export type ExpenseCategory =
  | 'cogs'
  | 'payroll'
  | 'marketing'
  | 'facilities'
  | 'software'
  | 'professional'
  | 'taxes'
  | 'other'

export type CurrencyCode = 'USD' | 'CAD' | 'EUR' | 'GBP' | 'AUD'

export const CURRENCY_CODES: readonly CurrencyCode[] = [
  'USD',
  'CAD',
  'EUR',
  'GBP',
  'AUD',
] as const

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'cogs',
  'payroll',
  'marketing',
  'facilities',
  'software',
  'professional',
  'taxes',
  'other',
] as const

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  cogs: 'Cost of goods sold',
  payroll: 'Payroll',
  marketing: 'Marketing',
  facilities: 'Facilities',
  software: 'Software',
  professional: 'Professional services',
  taxes: 'Taxes',
  other: 'Other',
}

export interface LineItem {
  id: string
  name: string
  fillMode: FillMode
  amounts: number[]
  uniformAmount: number
  growthPercent: number
  /** Forecast month index 0–11 for one-time mode. */
  oneTimeMonth: number
}

export interface ExpenseLineItem extends LineItem {
  category: ExpenseCategory
}

export interface Scenario {
  id: string
  name: string
  revenue: LineItem[]
  expenses: ExpenseLineItem[]
}

export interface PlannerState {
  schemaVersion: typeof SCHEMA_VERSION
  businessName: string
  startMonth: number
  startYear: number
  startingCash: number
  currency: CurrencyCode
  activeScenarioId: string
  scenarios: Scenario[]
}

export interface MonthSummary {
  label: string
  revenue: number
  cogs: number
  grossProfit: number
  /** null when revenue is 0 */
  grossMargin: number | null
  operatingExpenses: number
  /** COGS + operating expenses */
  expenses: number
  net: number
  /** null when revenue is 0 */
  netMargin: number | null
  cumulative: number
}

export interface ScenarioComparisonRow {
  scenarioId: string
  scenarioName: string
  totalRevenue: number
  grossProfit: number
  grossMargin: number | null
  totalExpenses: number
  yearNet: number
  netMargin: number | null
  endingCash: number
  lowestCash: number
  runwayLabel: string
  runwayMonths: number | null
}
