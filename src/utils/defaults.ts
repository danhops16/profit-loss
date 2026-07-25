import type { LineItem, PlannerState } from '../types'

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Fresh line item — never share nested arrays across calls. */
export function createEmptyLineItem(name = ''): LineItem {
  return {
    id: createId(),
    name,
    fillMode: 'uniform',
    amounts: Array.from({ length: 12 }, () => 0),
    uniformAmount: 0,
    growthPercent: 0,
  }
}

/** Completely fresh default planner — safe for reset and failed loads. */
export function createDefaultState(now = new Date()): PlannerState {
  return {
    businessName: 'My Startup',
    startMonth: 0,
    startYear: now.getFullYear(),
    startingCash: 10000,
    revenue: [createEmptyLineItem('Product sales')],
    expenses: [
      createEmptyLineItem('Salaries'),
      createEmptyLineItem('Rent & utilities'),
      createEmptyLineItem('Marketing'),
      createEmptyLineItem('Software & tools'),
    ],
  }
}
