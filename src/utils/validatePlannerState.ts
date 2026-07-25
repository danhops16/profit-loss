import type { FillMode, LineItem, PlannerState } from '../types'
import { createEmptyLineItem } from './defaults'

export type ParsePlannerResult =
  | { ok: true; state: PlannerState }
  | { ok: false; error: string }

const FILL_MODES: readonly FillMode[] = ['manual', 'uniform', 'growth']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Coerce to a finite number; otherwise use fallback. */
export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

/** Exactly 12 finite numbers; pad, truncate, and replace non-finite with 0. */
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
  return createEmptyLineItem().id
}

function normalizeName(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
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
  }
}

function normalizeLineItemList(value: unknown): LineItem[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const items: LineItem[] = []
  for (const entry of value) {
    const item = normalizeLineItem(entry)
    if (item) items.push(item)
  }

  // Empty arrays are allowed. If every entry was non-object, reject.
  if (value.length > 0 && items.length === 0) {
    return null
  }

  return items
}

function normalizeStartMonth(value: unknown, fallback: number): number {
  const n = Math.trunc(toFiniteNumber(value, fallback))
  if (n < 0 || n > 11) return fallback
  return n
}

function normalizeStartYear(value: unknown, fallback: number): number {
  const n = Math.trunc(toFiniteNumber(value, fallback))
  // Preserve a wide but sane range for older/future plans
  if (n < 1970 || n > 2200) return fallback
  return n
}

/**
 * Validate and normalize untrusted planner JSON (localStorage / import).
 * Preserves valid older shapes by coercing fields rather than rejecting lightly.
 */
export function parsePlannerState(input: unknown): ParsePlannerResult {
  if (!isRecord(input)) {
    return { ok: false, error: 'Plan must be a JSON object.' }
  }

  const fallbackYear = new Date().getFullYear()
  const revenue = normalizeLineItemList(input.revenue)
  const expenses = normalizeLineItemList(input.expenses)

  if (revenue === null) {
    return { ok: false, error: 'Plan is missing a valid "revenue" array.' }
  }
  if (expenses === null) {
    return { ok: false, error: 'Plan is missing a valid "expenses" array.' }
  }

  const businessName =
    typeof input.businessName === 'string'
      ? input.businessName
      : input.businessName == null
        ? 'My Startup'
        : String(input.businessName)

  const state: PlannerState = {
    businessName,
    startMonth: normalizeStartMonth(input.startMonth, 0),
    startYear: normalizeStartYear(input.startYear, fallbackYear),
    startingCash: toFiniteNumber(input.startingCash, 0),
    revenue,
    expenses,
  }

  return { ok: true, state }
}

/** Parse a JSON string; returns a clear error for invalid JSON or shape. */
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
