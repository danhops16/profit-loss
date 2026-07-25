import type {
  CashPurpose,
  CurrencyCode,
  ExpenseCategory,
  ExpenseLineItem,
  FillMode,
  FundingLineItem,
  FundingType,
  LineItem,
  OpeningFundSource,
  OpeningFundType,
  PlannerState,
  Scenario,
} from '../types'
import {
  CASH_PURPOSES,
  CURRENCY_CODES,
  EXPENSE_CATEGORIES,
  OPENING_FUND_TYPES,
  SCHEMA_VERSION,
} from '../types'
import {
  createEmptyExpenseLineItem,
  createEmptyFundingLineItem,
  createEmptyLineItem,
  createId,
  createOpeningFund,
} from './defaults'

export type ParsePlannerResult =
  | { ok: true; state: PlannerState }
  | { ok: false; error: string }

const FILL_MODES: readonly FillMode[] = [
  'manual',
  'uniform',
  'growth',
  'one-time',
  'percent-revenue',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export function normalizeAmounts(value: unknown): number[] {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length: 12 }, (_, i) => toFiniteNumber(source[i], 0))
}

function normalizeFillMode(value: unknown): FillMode {
  if (typeof value === 'string' && (FILL_MODES as readonly string[]).includes(value)) {
    return value as FillMode
  }
  return 'uniform'
}

function normalizeId(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) return value
  return createId()
}

function normalizeName(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function normalizeOneTimeMonth(value: unknown): number {
  const n = Math.trunc(toFiniteNumber(value, 0))
  return n < 0 || n > 11 ? 0 : n
}

function normalizeCategory(value: unknown): ExpenseCategory {
  if (
    typeof value === 'string' &&
    (EXPENSE_CATEGORIES as readonly string[]).includes(value)
  ) {
    return value as ExpenseCategory
  }
  return 'other'
}

function normalizeCashPurpose(
  value: unknown,
  categoryFallback?: ExpenseCategory,
): CashPurpose {
  if (typeof value === 'string' && (CASH_PURPOSES as readonly string[]).includes(value)) {
    return value as CashPurpose
  }
  // v2 migration: cogs → direct, else operating
  if (categoryFallback === 'cogs') return 'direct'
  return 'operating'
}

function normalizeCurrency(value: unknown): CurrencyCode {
  if (
    typeof value === 'string' &&
    (CURRENCY_CODES as readonly string[]).includes(value)
  ) {
    return value as CurrencyCode
  }
  return 'USD'
}

function normalizeFundType(value: unknown): OpeningFundType {
  if (
    typeof value === 'string' &&
    (OPENING_FUND_TYPES as readonly string[]).includes(value)
  ) {
    return value as OpeningFundType
  }
  return 'other'
}

function normalizeFundingType(value: unknown): FundingType {
  return normalizeFundType(value)
}

function normalizeStartMonth(value: unknown, fallback: number): number {
  const n = Math.trunc(toFiniteNumber(value, fallback))
  return n < 0 || n > 11 ? fallback : n
}

function normalizeStartYear(value: unknown, fallback: number): number {
  const n = Math.trunc(toFiniteNumber(value, fallback))
  return n < 1970 || n > 2200 ? fallback : n
}

export function normalizeLineItem(value: unknown): LineItem | null {
  if (!isRecord(value)) return null
  const revenueBasisId =
    typeof value.revenueBasisId === 'string' && value.revenueBasisId.length > 0
      ? value.revenueBasisId
      : null

  return {
    id: normalizeId(value.id),
    name: normalizeName(value.name),
    fillMode: normalizeFillMode(value.fillMode),
    amounts: normalizeAmounts(value.amounts),
    uniformAmount: toFiniteNumber(value.uniformAmount, 0),
    growthPercent: toFiniteNumber(value.growthPercent, 0),
    oneTimeMonth: normalizeOneTimeMonth(value.oneTimeMonth),
    percentOfRevenue: toFiniteNumber(value.percentOfRevenue, 0),
    revenueBasisId,
  }
}

export function normalizeExpenseLineItem(value: unknown): ExpenseLineItem | null {
  const base = normalizeLineItem(value)
  if (!base || !isRecord(value)) return null
  const category = normalizeCategory(value.category)
  return {
    ...base,
    category,
    cashPurpose: normalizeCashPurpose(value.cashPurpose, category),
  }
}

export function normalizeFundingLineItem(value: unknown): FundingLineItem | null {
  const base = normalizeLineItem(value)
  if (!base || !isRecord(value)) return null
  return {
    ...base,
    fundingType: normalizeFundingType(value.fundingType),
  }
}

function normalizeLineList(value: unknown): LineItem[] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .map((entry) => normalizeLineItem(entry))
    .filter((x): x is LineItem => x !== null)
  if (value.length > 0 && items.length === 0) return null
  return items
}

function normalizeExpenseList(value: unknown): ExpenseLineItem[] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .map((entry) => normalizeExpenseLineItem(entry))
    .filter((x): x is ExpenseLineItem => x !== null)
  if (value.length > 0 && items.length === 0) return null
  return items
}

function normalizeFundingList(value: unknown): FundingLineItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => normalizeFundingLineItem(entry))
    .filter((x): x is FundingLineItem => x !== null)
}

function normalizeOpeningFunds(value: unknown, legacyStartingCash?: unknown): OpeningFundSource[] {
  if (Array.isArray(value) && value.length > 0) {
    const funds: OpeningFundSource[] = []
    for (const entry of value) {
      if (!isRecord(entry)) continue
      funds.push({
        id: normalizeId(entry.id),
        name: normalizeName(entry.name) || 'Opening funds',
        type: normalizeFundType(entry.type),
        amount: toFiniteNumber(entry.amount, 0),
      })
    }
    if (funds.length > 0) return funds
  }

  const amount = toFiniteNumber(legacyStartingCash, 0)
  return [createOpeningFund('Opening funds', 'other', amount)]
}

function normalizeScenario(value: unknown): Scenario | null {
  if (!isRecord(value)) return null
  const revenue = normalizeLineList(value.revenue)
  const expenses = normalizeExpenseList(value.expenses)
  if (revenue === null || expenses === null) return null
  return {
    id: normalizeId(value.id),
    name: normalizeName(value.name) || 'Scenario',
    notes: typeof value.notes === 'string' ? value.notes : '',
    revenue,
    expenses,
    funding: normalizeFundingList(value.funding),
  }
}

function sharedFields(input: Record<string, unknown>) {
  const fallbackYear = new Date().getFullYear()
  const businessName =
    typeof input.businessName === 'string'
      ? input.businessName
      : input.businessName == null
        ? 'My Startup'
        : String(input.businessName)

  return {
    businessName,
    startMonth: normalizeStartMonth(input.startMonth, 0),
    startYear: normalizeStartYear(input.startYear, fallbackYear),
    currency: normalizeCurrency(input.currency),
    cashBuffer: toFiniteNumber(input.cashBuffer, 0),
    openingFunds: normalizeOpeningFunds(input.openingFunds, input.startingCash),
  }
}

function migrateFlatToV3(input: Record<string, unknown>): ParsePlannerResult {
  const revenue = normalizeLineList(input.revenue)
  const expenses = normalizeExpenseList(input.expenses)
  if (revenue === null) {
    return { ok: false, error: 'Plan is missing a valid "revenue" array.' }
  }
  if (expenses === null) {
    return { ok: false, error: 'Plan is missing a valid "expenses" array.' }
  }

  const scenarioId = createId()
  const scenario: Scenario = {
    id: scenarioId,
    name: 'Base',
    notes: '',
    revenue,
    expenses,
    funding: normalizeFundingList(input.funding),
  }

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION,
      ...sharedFields(input),
      activeScenarioId: scenarioId,
      scenarios: [scenario],
    },
  }
}

function parseMultiScenario(input: Record<string, unknown>): ParsePlannerResult {
  if (!Array.isArray(input.scenarios) || input.scenarios.length === 0) {
    if (Array.isArray(input.revenue) || Array.isArray(input.expenses)) {
      return migrateFlatToV3(input)
    }
    return { ok: false, error: 'Plan must include at least one scenario.' }
  }

  const scenarios: Scenario[] = []
  for (const entry of input.scenarios) {
    const scenario = normalizeScenario(entry)
    if (scenario) scenarios.push(scenario)
  }
  if (scenarios.length === 0) {
    return { ok: false, error: 'Plan scenarios are invalid.' }
  }

  let activeScenarioId =
    typeof input.activeScenarioId === 'string' ? input.activeScenarioId : scenarios[0].id
  if (!scenarios.some((s) => s.id === activeScenarioId)) {
    activeScenarioId = scenarios[0].id
  }

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION,
      ...sharedFields(input),
      activeScenarioId,
      scenarios,
    },
  }
}

/**
 * Validate/normalize untrusted planner JSON.
 * Accepts schema v1 (flat), v2 (scenarios), and v3 (cash-first).
 */
export function parsePlannerState(input: unknown): ParsePlannerResult {
  if (!isRecord(input)) {
    return { ok: false, error: 'Plan must be a JSON object.' }
  }

  if (Array.isArray(input.scenarios) || toFiniteNumber(input.schemaVersion, 0) >= 2) {
    return parseMultiScenario(input)
  }

  if (Array.isArray(input.revenue) || Array.isArray(input.expenses)) {
    return migrateFlatToV3(input)
  }

  return {
    ok: false,
    error: 'Unrecognized plan format. Expected a year-one cash planner export.',
  }
}

export function parsePlannerJson(raw: string): ParsePlannerResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return {
      ok: false,
      error: 'Could not read that file. Please use a valid planner export (.json).',
    }
  }
  return parsePlannerState(parsed)
}

export {
  createEmptyLineItem,
  createEmptyExpenseLineItem,
  createEmptyFundingLineItem,
}
