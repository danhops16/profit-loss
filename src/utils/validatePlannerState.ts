import type {
  CurrencyCode,
  ExpenseCategory,
  ExpenseLineItem,
  FillMode,
  LineItem,
  PlannerState,
  Scenario,
} from '../types'
import {
  CURRENCY_CODES,
  EXPENSE_CATEGORIES,
  SCHEMA_VERSION,
} from '../types'
import { createEmptyExpenseLineItem, createEmptyLineItem, createId } from './defaults'

export type ParsePlannerResult =
  | { ok: true; state: PlannerState }
  | { ok: false; error: string }

const FILL_MODES: readonly FillMode[] = ['manual', 'uniform', 'growth', 'one-time']

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
  const result: number[] = []
  for (let i = 0; i < 12; i++) {
    result.push(toFiniteNumber(source[i], 0))
  }
  return result
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
  if (n < 0 || n > 11) return 0
  return n
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

function normalizeCurrency(value: unknown): CurrencyCode {
  if (
    typeof value === 'string' &&
    (CURRENCY_CODES as readonly string[]).includes(value)
  ) {
    return value as CurrencyCode
  }
  return 'USD'
}

export function normalizeLineItem(value: unknown): LineItem | null {
  if (!isRecord(value)) return null

  return {
    id: normalizeId(value.id),
    name: normalizeName(value.name),
    fillMode: normalizeFillMode(value.fillMode),
    amounts: normalizeAmounts(value.amounts),
    uniformAmount: toFiniteNumber(value.uniformAmount, 0),
    growthPercent: toFiniteNumber(value.growthPercent, 0),
    oneTimeMonth: normalizeOneTimeMonth(value.oneTimeMonth),
  }
}

export function normalizeExpenseLineItem(value: unknown): ExpenseLineItem | null {
  const base = normalizeLineItem(value)
  if (!base) return null
  const category = isRecord(value) ? normalizeCategory(value.category) : 'other'
  return { ...base, category }
}

function normalizeLineItemList(value: unknown): LineItem[] | null {
  if (!Array.isArray(value)) return null
  const items: LineItem[] = []
  for (const entry of value) {
    const item = normalizeLineItem(entry)
    if (item) items.push(item)
  }
  if (value.length > 0 && items.length === 0) return null
  return items
}

function normalizeExpenseList(value: unknown): ExpenseLineItem[] | null {
  if (!Array.isArray(value)) return null
  const items: ExpenseLineItem[] = []
  for (const entry of value) {
    const item = normalizeExpenseLineItem(entry)
    if (item) items.push(item)
  }
  if (value.length > 0 && items.length === 0) return null
  return items
}

function normalizeStartMonth(value: unknown, fallback: number): number {
  const n = Math.trunc(toFiniteNumber(value, fallback))
  if (n < 0 || n > 11) return fallback
  return n
}

function normalizeStartYear(value: unknown, fallback: number): number {
  const n = Math.trunc(toFiniteNumber(value, fallback))
  if (n < 1970 || n > 2200) return fallback
  return n
}

function normalizeScenario(value: unknown): Scenario | null {
  if (!isRecord(value)) return null
  const revenue = normalizeLineItemList(value.revenue)
  const expenses = normalizeExpenseList(value.expenses)
  if (revenue === null || expenses === null) return null
  return {
    id: normalizeId(value.id),
    name: normalizeName(value.name) || 'Scenario',
    revenue,
    expenses,
  }
}

function migrateV1ToV2(input: Record<string, unknown>): ParsePlannerResult {
  const revenue = normalizeLineItemList(input.revenue)
  const expenses = normalizeExpenseList(input.expenses)
  if (revenue === null) {
    return { ok: false, error: 'Plan is missing a valid "revenue" array.' }
  }
  if (expenses === null) {
    return { ok: false, error: 'Plan is missing a valid "expenses" array.' }
  }

  const fallbackYear = new Date().getFullYear()
  const scenarioId = createId()
  const scenario: Scenario = {
    id: scenarioId,
    name: 'Base',
    revenue,
    expenses,
  }

  const businessName =
    typeof input.businessName === 'string'
      ? input.businessName
      : input.businessName == null
        ? 'My Startup'
        : String(input.businessName)

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION,
      businessName,
      startMonth: normalizeStartMonth(input.startMonth, 0),
      startYear: normalizeStartYear(input.startYear, fallbackYear),
      startingCash: toFiniteNumber(input.startingCash, 0),
      currency: normalizeCurrency(input.currency),
      activeScenarioId: scenarioId,
      scenarios: [scenario],
    },
  }
}

function parseV2(input: Record<string, unknown>): ParsePlannerResult {
  if (!Array.isArray(input.scenarios) || input.scenarios.length === 0) {
    // Allow accidental half-migrated objects that still have top-level lines
    if (Array.isArray(input.revenue) || Array.isArray(input.expenses)) {
      return migrateV1ToV2(input)
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

  const fallbackYear = new Date().getFullYear()
  const businessName =
    typeof input.businessName === 'string'
      ? input.businessName
      : input.businessName == null
        ? 'My Startup'
        : String(input.businessName)

  let activeScenarioId =
    typeof input.activeScenarioId === 'string' ? input.activeScenarioId : scenarios[0].id
  if (!scenarios.some((s) => s.id === activeScenarioId)) {
    activeScenarioId = scenarios[0].id
  }

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION,
      businessName,
      startMonth: normalizeStartMonth(input.startMonth, 0),
      startYear: normalizeStartYear(input.startYear, fallbackYear),
      startingCash: toFiniteNumber(input.startingCash, 0),
      currency: normalizeCurrency(input.currency),
      activeScenarioId,
      scenarios,
    },
  }
}

/**
 * Validate and normalize untrusted planner JSON (localStorage / import).
 * Supports unversioned v1 plans and schemaVersion 2 multi-scenario plans.
 */
export function parsePlannerState(input: unknown): ParsePlannerResult {
  if (!isRecord(input)) {
    return { ok: false, error: 'Plan must be a JSON object.' }
  }

  const version = toFiniteNumber(input.schemaVersion, 0)

  if (version >= 2 || Array.isArray(input.scenarios)) {
    return parseV2(input)
  }

  // Unversioned / v1 single-plan shape
  if (Array.isArray(input.revenue) || Array.isArray(input.expenses)) {
    return migrateV1ToV2(input)
  }

  return {
    ok: false,
    error: 'Unrecognized plan format. Expected a year-one P&L export.',
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

/** Hint helpers for presets — not used by validation. */
export function categoryForExpensePreset(name: string): ExpenseCategory {
  const map: Record<string, ExpenseCategory> = {
    Salaries: 'payroll',
    'Rent & utilities': 'facilities',
    Marketing: 'marketing',
    'Software & tools': 'software',
    Contractors: 'professional',
    Insurance: 'other',
    'Legal & accounting': 'professional',
    Travel: 'other',
    'Office supplies': 'other',
    'Cost of goods': 'cogs',
    COGS: 'cogs',
  }
  return map[name] ?? 'other'
}

export { createEmptyLineItem, createEmptyExpenseLineItem }
