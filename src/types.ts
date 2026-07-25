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

export const SCHEMA_VERSION = 3 as const

export type FillMode =
  | 'manual'
  | 'uniform'
  | 'growth'
  | 'one-time'
  | 'percent-revenue'

export type ExpenseCategory =
  | 'cogs'
  | 'payroll'
  | 'marketing'
  | 'facilities'
  | 'software'
  | 'professional'
  | 'taxes'
  | 'other'

export type CashPurpose =
  | 'direct'
  | 'operating'
  | 'startup'
  | 'loan_payment'
  | 'other_outflow'

export type OpeningFundType = 'loan' | 'owner' | 'grant' | 'other'
export type FundingType = OpeningFundType

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
  cogs: 'Materials / COGS detail',
  payroll: 'Payroll',
  marketing: 'Marketing',
  facilities: 'Facilities',
  software: 'Software',
  professional: 'Professional services',
  taxes: 'Taxes',
  other: 'Other',
}

export const CASH_PURPOSES: readonly CashPurpose[] = [
  'direct',
  'operating',
  'startup',
  'loan_payment',
  'other_outflow',
] as const

export const CASH_PURPOSE_LABELS: Record<CashPurpose, string> = {
  direct: 'Direct cost',
  operating: 'Ongoing operating cost',
  startup: 'Startup cost',
  loan_payment: 'Loan payment',
  other_outflow: 'Other cash outflow',
}

export const OPENING_FUND_TYPES: readonly OpeningFundType[] = [
  'loan',
  'owner',
  'grant',
  'other',
] as const

export const OPENING_FUND_TYPE_LABELS: Record<OpeningFundType, string> = {
  loan: 'Loan funds',
  owner: 'Owner / personal funds',
  grant: 'Grants',
  other: 'Other opening funds',
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
  /** Percent for percent-revenue mode (e.g. 5 = 5%). */
  percentOfRevenue: number
  /** null = total revenue; otherwise a revenue line id. */
  revenueBasisId: string | null
}

export interface ExpenseLineItem extends LineItem {
  category: ExpenseCategory
  cashPurpose: CashPurpose
}

export interface FundingLineItem extends LineItem {
  fundingType: FundingType
}

export interface OpeningFundSource {
  id: string
  name: string
  type: OpeningFundType
  amount: number
}

export interface Scenario {
  id: string
  name: string
  notes: string
  revenue: LineItem[]
  expenses: ExpenseLineItem[]
  funding: FundingLineItem[]
}

export interface PlannerState {
  schemaVersion: typeof SCHEMA_VERSION
  businessName: string
  startMonth: number
  startYear: number
  currency: CurrencyCode
  /** Desired minimum ending-cash buffer. */
  cashBuffer: number
  openingFunds: OpeningFundSource[]
  activeScenarioId: string
  scenarios: Scenario[]
}

export interface MonthSummary {
  label: string
  revenue: number
  directCosts: number
  grossContribution: number
  operatingCosts: number
  operatingProfit: number
  startupSpending: number
  loanPayments: number
  otherOutflows: number
  additionalFunding: number
  /** All cash outflows (direct + operating + startup + loan + other). */
  totalOutflows: number
  netCashChange: number
  endingCash: number
  /** How far below the desired buffer (0 if at/above). */
  bufferGap: number
}

export interface ScenarioComparisonRow {
  scenarioId: string
  scenarioName: string
  cashAfterMonthOne: number
  lowestCash: number
  lowestCashMonthLabel: string | null
  personalFundingRequired: number
  firstNegativeCashMonthLabel: string | null
  endingCash: number
  operatingProfit: number
}
