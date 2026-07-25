import { describe, expect, it } from 'vitest'
import type { ExpenseLineItem, LineItem, PlannerState, Scenario } from '../types'
import { SCHEMA_VERSION } from '../types'
import {
  buildMetrics,
  buildSummaries,
  buildSummariesForScenario,
  forecastMonthLabels,
  resolveAmounts,
} from './calculations'
import { createDefaultState, createEmptyExpenseLineItem, createEmptyLineItem } from './defaults'

function rev(partial: Partial<LineItem> & Pick<LineItem, 'fillMode'>): LineItem {
  return {
    ...createEmptyLineItem('r'),
    ...partial,
  }
}

function exp(
  partial: Partial<ExpenseLineItem> & Pick<ExpenseLineItem, 'fillMode'>,
): ExpenseLineItem {
  return {
    ...createEmptyExpenseLineItem('e', partial.category ?? 'other'),
    ...partial,
  }
}

function stateFromScenario(
  scenario: Scenario,
  overrides: Partial<PlannerState> = {},
): PlannerState {
  return {
    schemaVersion: SCHEMA_VERSION,
    businessName: 'Test',
    startMonth: 0,
    startYear: 2026,
    startingCash: 0,
    currency: 'USD',
    activeScenarioId: scenario.id,
    scenarios: [scenario],
    ...overrides,
  }
}

describe('resolveAmounts', () => {
  it('fills uniform amounts', () => {
    expect(resolveAmounts(rev({ fillMode: 'uniform', uniformAmount: 100 }))).toEqual(
      Array(12).fill(100),
    )
  })

  it('compounds growth and negative growth', () => {
    expect(
      resolveAmounts(rev({ fillMode: 'growth', uniformAmount: 100, growthPercent: 10 }))[1],
    ).toBe(110)
    expect(
      resolveAmounts(rev({ fillMode: 'growth', uniformAmount: 100, growthPercent: -50 }))[1],
    ).toBe(50)
  })

  it('places one-time amount in a single month', () => {
    const amounts = resolveAmounts(
      rev({ fillMode: 'one-time', uniformAmount: 2500, oneTimeMonth: 3 }),
    )
    expect(amounts).toEqual([0, 0, 0, 2500, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('clamps invalid one-time month to 0', () => {
    expect(
      resolveAmounts(
        rev({ fillMode: 'one-time', uniformAmount: 10, oneTimeMonth: 99 }),
      )[0],
    ).toBe(10)
  })

  it('pads short manual arrays and zeros non-finite cells', () => {
    expect(
      resolveAmounts(
        rev({
          fillMode: 'manual',
          amounts: [10, Number.NaN, Number.POSITIVE_INFINITY],
        }),
      ),
    ).toEqual([10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  })
})

describe('P&L structure', () => {
  it('computes revenue − COGS = gross and gross − OpEx = net', () => {
    const scenario: Scenario = {
      id: 's1',
      name: 'Base',
      revenue: [rev({ fillMode: 'uniform', uniformAmount: 1000 })],
      expenses: [
        exp({ fillMode: 'uniform', uniformAmount: 400, category: 'cogs' }),
        exp({ fillMode: 'uniform', uniformAmount: 250, category: 'payroll' }),
      ],
    }
    const summaries = buildSummariesForScenario(scenario, 0, 2026, 0)
    expect(summaries[0].revenue).toBe(1000)
    expect(summaries[0].cogs).toBe(400)
    expect(summaries[0].grossProfit).toBe(600)
    expect(summaries[0].operatingExpenses).toBe(250)
    expect(summaries[0].expenses).toBe(650)
    expect(summaries[0].net).toBe(350)
    expect(summaries[0].grossMargin).toBeCloseTo(0.6)
    expect(summaries[0].netMargin).toBeCloseTo(0.35)
  })

  it('returns null margins when revenue is zero', () => {
    const scenario: Scenario = {
      id: 's1',
      name: 'Base',
      revenue: [rev({ fillMode: 'uniform', uniformAmount: 0 })],
      expenses: [exp({ fillMode: 'uniform', uniformAmount: 100, category: 'other' })],
    }
    const summaries = buildSummariesForScenario(scenario, 0, 2026, 0)
    expect(summaries[0].grossMargin).toBeNull()
    expect(summaries[0].netMargin).toBeNull()
    const metrics = buildMetrics(summaries, 0)
    expect(metrics.grossMargin).toBeNull()
    expect(metrics.netMargin).toBeNull()
  })

  it('keeps annual totals equal to sum of months', () => {
    const state = createDefaultState(new Date('2026-01-01'))
    const scenario = state.scenarios[0]
    scenario.revenue[0] = rev({
      fillMode: 'growth',
      uniformAmount: 100,
      growthPercent: 5,
    })
    scenario.expenses[0] = exp({
      fillMode: 'uniform',
      uniformAmount: 50,
      category: 'payroll',
    })
    const summaries = buildSummaries(state)
    const metrics = buildMetrics(summaries, state.startingCash)
    expect(metrics.totalRevenue).toBeCloseTo(
      summaries.reduce((s, m) => s + m.revenue, 0),
      2,
    )
    expect(metrics.yearNet).toBeCloseTo(summaries.reduce((s, m) => s + m.net, 0), 2)
    expect(metrics.endingCash).toBeCloseTo(
      state.startingCash + summaries.reduce((s, m) => s + m.net, 0),
      2,
    )
  })
})

describe('runway', () => {
  it('reports already negative starting cash', () => {
    const summaries = buildSummariesForScenario(
      { id: 's', name: 'B', revenue: [], expenses: [] },
      0,
      2026,
      -100,
    )
    const m = buildMetrics(summaries, -100)
    expect(m.runwayLabel).toBe('0 months — already negative')
    expect(m.runwayMonths).toBe(0)
  })

  it('reports 0 full months when month 1 ends negative', () => {
    const summaries = buildSummariesForScenario(
      {
        id: 's',
        name: 'B',
        revenue: [],
        expenses: [exp({ fillMode: 'uniform', uniformAmount: 100, category: 'other' })],
      },
      0,
      2026,
      50,
    )
    const m = buildMetrics(summaries, 50)
    expect(summaries[0].cumulative).toBe(-50)
    expect(m.runwayLabel).toBe('0 full months')
    expect(m.runwayMonths).toBe(0)
  })

  it('counts complete months before cash goes negative', () => {
    const summaries = buildSummariesForScenario(
      {
        id: 's',
        name: 'B',
        revenue: [],
        expenses: [exp({ fillMode: 'uniform', uniformAmount: 40, category: 'other' })],
      },
      0,
      2026,
      100,
    )
    // 100 → 60 → 20 → -20  (neg at index 2) => 2 full months
    const m = buildMetrics(summaries, 100)
    expect(m.runwayMonths).toBe(2)
    expect(m.runwayLabel).toBe('2 full months')
    expect(m.firstNegativeCashMonthLabel).toBe('Mar 2026')
  })

  it('reports 12+ months when cash stays non-negative including exact zero', () => {
    const summaries = buildSummariesForScenario(
      {
        id: 's',
        name: 'B',
        revenue: [rev({ fillMode: 'uniform', uniformAmount: 10 })],
        expenses: [exp({ fillMode: 'uniform', uniformAmount: 10, category: 'other' })],
      },
      0,
      2026,
      0,
    )
    expect(summaries.every((s) => s.cumulative === 0)).toBe(true)
    const m = buildMetrics(summaries, 0)
    expect(m.runwayLabel).toBe('12+ months')
    expect(m.runwayMonths).toBeNull()
  })

  it('finds first profitable month only when net > 0', () => {
    const summaries = buildSummariesForScenario(
      {
        id: 's',
        name: 'B',
        revenue: [
          rev({
            fillMode: 'manual',
            amounts: [0, 0, 50, ...Array(9).fill(0)],
          }),
        ],
        expenses: [
          exp({
            fillMode: 'manual',
            amounts: [10, 0, 0, ...Array(9).fill(0)],
            category: 'other',
          }),
        ],
      },
      0,
      2026,
      0,
    )
    expect(buildMetrics(summaries, 0).firstProfitableMonthLabel).toBe('Mar 2026')
  })
})

describe('forecastMonthLabels', () => {
  it('rolls across year boundaries', () => {
    expect(forecastMonthLabels(10, 2026).slice(0, 3)).toEqual([
      'Nov 2026',
      'Dec 2026',
      'Jan 2027',
    ])
  })
})

describe('one-time with calendar labels', () => {
  it('lands in the correct rolled month index', () => {
    const amounts = resolveAmounts(
      rev({ fillMode: 'one-time', uniformAmount: 1, oneTimeMonth: 2 }),
    )
    const labels = forecastMonthLabels(10, 2026)
    expect(labels[2]).toBe('Jan 2027')
    expect(amounts[2]).toBe(1)
  })
})

describe('stateFromScenario helper wiring', () => {
  it('buildSummaries uses active scenario lines', () => {
    const s = stateFromScenario({
      id: 'a',
      name: 'A',
      revenue: [rev({ fillMode: 'uniform', uniformAmount: 5 })],
      expenses: [],
    })
    expect(buildSummaries(s)[0].revenue).toBe(5)
  })
})
