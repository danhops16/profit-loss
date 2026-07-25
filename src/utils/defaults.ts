import type {
  ExpenseCategory,
  ExpenseLineItem,
  LineItem,
  PlannerState,
  Scenario,
} from '../types'
import { SCHEMA_VERSION } from '../types'

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyLineItem(name = ''): LineItem {
  return {
    id: createId(),
    name,
    fillMode: 'uniform',
    amounts: Array.from({ length: 12 }, () => 0),
    uniformAmount: 0,
    growthPercent: 0,
    oneTimeMonth: 0,
  }
}

export function createEmptyExpenseLineItem(
  name = '',
  category: ExpenseCategory = 'other',
): ExpenseLineItem {
  return {
    ...createEmptyLineItem(name),
    category,
  }
}

export function createBlankScenario(name = 'New scenario'): Scenario {
  return {
    id: createId(),
    name,
    revenue: [createEmptyLineItem('Product sales')],
    expenses: [
      createEmptyExpenseLineItem('Salaries', 'payroll'),
      createEmptyExpenseLineItem('Rent & utilities', 'facilities'),
      createEmptyExpenseLineItem('Marketing', 'marketing'),
      createEmptyExpenseLineItem('Software & tools', 'software'),
    ],
  }
}

export function cloneLineItem(item: LineItem, newId = true): LineItem {
  return {
    ...item,
    id: newId ? createId() : item.id,
    amounts: [...item.amounts],
  }
}

export function cloneExpenseLineItem(
  item: ExpenseLineItem,
  newId = true,
): ExpenseLineItem {
  return {
    ...cloneLineItem(item, newId),
    category: item.category,
  }
}

export function cloneScenario(scenario: Scenario, name?: string): Scenario {
  return {
    id: createId(),
    name: name ?? `${scenario.name} copy`,
    revenue: scenario.revenue.map((r) => cloneLineItem(r, true)),
    expenses: scenario.expenses.map((e) => cloneExpenseLineItem(e, true)),
  }
}

export function createDefaultState(now = new Date()): PlannerState {
  const base = createBlankScenario('Base')
  return {
    schemaVersion: SCHEMA_VERSION,
    businessName: 'My Startup',
    startMonth: 0,
    startYear: now.getFullYear(),
    startingCash: 10000,
    currency: 'USD',
    activeScenarioId: base.id,
    scenarios: [base],
  }
}

/** Resolve active scenario; falls back to first scenario. */
export function getActiveScenario(state: PlannerState): Scenario {
  return (
    state.scenarios.find((s) => s.id === state.activeScenarioId) ??
    state.scenarios[0]
  )
}
