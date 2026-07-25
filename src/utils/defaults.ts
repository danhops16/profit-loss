import type {
  CashPurpose,
  ExpenseCategory,
  ExpenseLineItem,
  FundingLineItem,
  FundingType,
  LineItem,
  OpeningFundSource,
  OpeningFundType,
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
    percentOfRevenue: 0,
    revenueBasisId: null,
  }
}

export function createEmptyExpenseLineItem(
  name = '',
  cashPurpose: CashPurpose = 'operating',
  category: ExpenseCategory = 'other',
): ExpenseLineItem {
  return {
    ...createEmptyLineItem(name),
    category,
    cashPurpose,
  }
}

export function createEmptyFundingLineItem(
  name = '',
  fundingType: FundingType = 'owner',
): FundingLineItem {
  return {
    ...createEmptyLineItem(name),
    fillMode: 'one-time',
    fundingType,
  }
}

export function createOpeningFund(
  name = 'Opening funds',
  type: OpeningFundType = 'other',
  amount = 0,
): OpeningFundSource {
  return { id: createId(), name, type, amount }
}

export function createBlankScenario(name = 'New scenario'): Scenario {
  return {
    id: createId(),
    name,
    notes: '',
    revenue: [createEmptyLineItem('Product / service sales')],
    expenses: [
      createEmptyExpenseLineItem('Salaries', 'operating', 'payroll'),
      createEmptyExpenseLineItem('Rent & utilities', 'operating', 'facilities'),
      createEmptyExpenseLineItem('Marketing', 'operating', 'marketing'),
      createEmptyExpenseLineItem('Software & tools', 'operating', 'software'),
    ],
    funding: [],
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
    cashPurpose: item.cashPurpose,
  }
}

export function cloneFundingLineItem(
  item: FundingLineItem,
  newId = true,
): FundingLineItem {
  return {
    ...cloneLineItem(item, newId),
    fundingType: item.fundingType,
  }
}

export function cloneScenario(scenario: Scenario, name?: string): Scenario {
  return {
    id: createId(),
    name: name ?? `${scenario.name} copy`,
    notes: scenario.notes,
    revenue: scenario.revenue.map((r) => cloneLineItem(r, true)),
    expenses: scenario.expenses.map((e) => cloneExpenseLineItem(e, true)),
    funding: scenario.funding.map((f) => cloneFundingLineItem(f, true)),
  }
}

export function totalOpeningFunds(funds: OpeningFundSource[]): number {
  return funds.reduce((s, f) => s + (Number.isFinite(f.amount) ? f.amount : 0), 0)
}

export function createDefaultState(now = new Date()): PlannerState {
  const base = createBlankScenario('Base')
  return {
    schemaVersion: SCHEMA_VERSION,
    businessName: 'My Startup',
    startMonth: 0,
    startYear: now.getFullYear(),
    currency: 'USD',
    cashBuffer: 0,
    openingFunds: [createOpeningFund('Opening funds', 'other', 10000)],
    activeScenarioId: base.id,
    scenarios: [base],
  }
}

export function getActiveScenario(state: PlannerState): Scenario {
  return (
    state.scenarios.find((s) => s.id === state.activeScenarioId) ??
    state.scenarios[0]
  )
}
