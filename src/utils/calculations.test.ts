import { describe, expect, it } from 'vitest'
import type { LineItem, PlannerState } from '../types'
import {
  buildMetrics,
  buildSummaries,
  forecastMonthLabels,
  resolveAmounts,
} from './calculations'

function line(
  partial: Partial<LineItem> & Pick<LineItem, 'fillMode'>,
): LineItem {
  return {
    id: 'test',
    name: 'item',
    amounts: Array.from({ length: 12 }, () => 0),
    uniformAmount: 0,
    growthPercent: 0,
    ...partial,
  }
}

function baseState(overrides: Partial<PlannerState> = {}): PlannerState {
  return {
    businessName: 'Test Co',
    startMonth: 0,
    startYear: 2026,
    startingCash: 0,
    revenue: [],
    expenses: [],
    ...overrides,
  }
}

describe('resolveAmounts', () => {
  it('fills uniform amounts across 12 months', () => {
    expect(resolveAmounts(line({ fillMode: 'uniform', uniformAmount: 100 }))).toEqual(
      Array(12).fill(100),
    )
  })

  it('compounds positive month-over-month growth', () => {
    const amounts = resolveAmounts(
      line({ fillMode: 'growth', uniformAmount: 100, growthPercent: 10 }),
    )
    expect(amounts[0]).toBe(100)
    expect(amounts[1]).toBe(110)
    expect(amounts[2]).toBe(121)
    expect(amounts).toHaveLength(12)
  })

  it('supports negative growth', () => {
    const amounts = resolveAmounts(
      line({ fillMode: 'growth', uniformAmount: 100, growthPercent: -50 }),
    )
    expect(amounts[0]).toBe(100)
    expect(amounts[1]).toBe(50)
    expect(amounts[2]).toBe(25)
  })

  it('uses manual amounts and pads short arrays', () => {
    expect(
      resolveAmounts(
        line({
          fillMode: 'manual',
          amounts: [10, 20, 30],
        }),
      ),
    ).toEqual([10, 20, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('truncates manual amounts longer than 12', () => {
    const amounts = Array.from({ length: 15 }, (_, i) => i + 1)
    expect(resolveAmounts(line({ fillMode: 'manual', amounts }))).toEqual(
      amounts.slice(0, 12),
    )
  })

  it('rounds growth values to cents', () => {
    const amounts = resolveAmounts(
      line({ fillMode: 'growth', uniformAmount: 10, growthPercent: 33 }),
    )
    expect(amounts[0]).toBe(10)
    expect(amounts[1]).toBe(13.3)
    expect(amounts[2]).toBe(17.69)
  })

  it('treats non-finite uniform and growth inputs as zero', () => {
    expect(
      resolveAmounts(
        line({
          fillMode: 'uniform',
          uniformAmount: Number.NaN,
        }),
      ),
    ).toEqual(Array(12).fill(0))

    expect(
      resolveAmounts(
        line({
          fillMode: 'growth',
          uniformAmount: Number.POSITIVE_INFINITY,
          growthPercent: Number.NaN,
        }),
      ),
    ).toEqual(Array(12).fill(0))
  })

  it('treats non-finite manual cells as zero', () => {
    expect(
      resolveAmounts(
        line({
          fillMode: 'manual',
          amounts: [5, Number.NaN, Number.POSITIVE_INFINITY, 8],
        }),
      )[0],
    ).toBe(5)
    expect(
      resolveAmounts(
        line({
          fillMode: 'manual',
          amounts: [5, Number.NaN, Number.POSITIVE_INFINITY, 8],
        }),
      )[1],
    ).toBe(0)
    expect(
      resolveAmounts(
        line({
          fillMode: 'manual',
          amounts: [5, Number.NaN, Number.POSITIVE_INFINITY, 8],
        }),
      )[2],
    ).toBe(0)
    expect(
      resolveAmounts(
        line({
          fillMode: 'manual',
          amounts: [5, Number.NaN, Number.POSITIVE_INFINITY, 8],
        }),
      )[3],
    ).toBe(8)
  })
})

describe('buildSummaries', () => {
  it('totals revenue and expenses and nets each month', () => {
    const summaries = buildSummaries(
      baseState({
        startingCash: 1000,
        revenue: [line({ fillMode: 'uniform', uniformAmount: 500 })],
        expenses: [line({ fillMode: 'uniform', uniformAmount: 200 })],
      }),
    )

    expect(summaries[0]).toMatchObject({
      label: 'Jan 2026',
      revenue: 500,
      expenses: 200,
      net: 300,
      cumulative: 1300,
    })
    expect(summaries[11].cumulative).toBe(1000 + 300 * 12)
  })

  it('rolls calendar labels across year boundaries', () => {
    const summaries = buildSummaries(
      baseState({
        startMonth: 10,
        startYear: 2026,
        revenue: [line({ fillMode: 'uniform', uniformAmount: 0 })],
      }),
    )

    expect(summaries.map((s) => s.label)).toEqual([
      'Nov 2026',
      'Dec 2026',
      'Jan 2027',
      'Feb 2027',
      'Mar 2027',
      'Apr 2027',
      'May 2027',
      'Jun 2027',
      'Jul 2027',
      'Aug 2027',
      'Sep 2027',
      'Oct 2027',
    ])
  })

  it('tracks cumulative cash from starting balance', () => {
    const summaries = buildSummaries(
      baseState({
        startingCash: 50,
        revenue: [
          line({
            fillMode: 'manual',
            amounts: [0, 0, 100, ...Array(9).fill(0)],
          }),
        ],
        expenses: [
          line({
            fillMode: 'manual',
            amounts: [20, 20, 0, ...Array(9).fill(0)],
          }),
        ],
      }),
    )

    expect(summaries[0].cumulative).toBe(30)
    expect(summaries[1].cumulative).toBe(10)
    expect(summaries[2].cumulative).toBe(110)
  })

  it('sums multiple line items', () => {
    const summaries = buildSummaries(
      baseState({
        revenue: [
          line({ fillMode: 'uniform', uniformAmount: 100 }),
          line({ fillMode: 'uniform', uniformAmount: 50 }),
        ],
        expenses: [line({ fillMode: 'uniform', uniformAmount: 40 })],
      }),
    )
    expect(summaries[0].revenue).toBe(150)
    expect(summaries[0].expenses).toBe(40)
    expect(summaries[0].net).toBe(110)
  })
})

describe('forecastMonthLabels', () => {
  it('matches buildSummaries labels across rollover', () => {
    expect(forecastMonthLabels(11, 2025)).toEqual(
      buildSummaries(baseState({ startMonth: 11, startYear: 2025 })).map(
        (s) => s.label,
      ),
    )
  })
})

describe('buildMetrics', () => {
  it('finds first month with strictly positive net', () => {
    const summaries = buildSummaries(
      baseState({
        startingCash: 0,
        revenue: [
          line({
            fillMode: 'manual',
            amounts: [0, 0, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          }),
        ],
        expenses: [
          line({
            fillMode: 'manual',
            amounts: [10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          }),
        ],
      }),
    )
    const metrics = buildMetrics(summaries, 0)
    // Jan net -10, Feb 0, Mar +50
    expect(metrics.firstProfitableMonthLabel).toBe('Mar 2026')
    expect(summaries[1].net).toBe(0)
  })

  it('returns null first profitable month when never strictly positive', () => {
    const summaries = buildSummaries(
      baseState({
        revenue: [line({ fillMode: 'uniform', uniformAmount: 10 })],
        expenses: [line({ fillMode: 'uniform', uniformAmount: 10 })],
      }),
    )
    expect(buildMetrics(summaries, 0).firstProfitableMonthLabel).toBeNull()
  })

  it('computes average monthly loss only over loss months', () => {
    const summaries = buildSummaries(
      baseState({
        revenue: [
          line({
            fillMode: 'manual',
            amounts: [0, 100, 0, ...Array(9).fill(0)],
          }),
        ],
        expenses: [
          line({
            fillMode: 'manual',
            amounts: [40, 0, 20, ...Array(9).fill(0)],
          }),
        ],
      }),
    )
    const metrics = buildMetrics(summaries, 0)
    // losses: -40 and -20 → avg abs 30
    expect(metrics.averageMonthlyLoss).toBe(30)
    expect(metrics.monthsAtLoss).toBe(2)
  })

  it('reports runway as already negative when starting cash is negative', () => {
    const summaries = buildSummaries(
      baseState({
        startingCash: -100,
        revenue: [line({ fillMode: 'uniform', uniformAmount: 1000 })],
        expenses: [line({ fillMode: 'uniform', uniformAmount: 0 })],
      }),
    )
    expect(buildMetrics(summaries, -100).runwayLabel).toBe('Already negative')
  })

  it('reports first month ending cash goes negative', () => {
    const summaries = buildSummaries(
      baseState({
        startingCash: 50,
        revenue: [line({ fillMode: 'uniform', uniformAmount: 0 })],
        expenses: [line({ fillMode: 'uniform', uniformAmount: 40 })],
      }),
    )
    // 50 → 10 → -30 in Feb
    expect(buildMetrics(summaries, 50).runwayLabel).toBe('Feb 2026')
  })

  it('reports 12+ months when cash stays non-negative', () => {
    const summaries = buildSummaries(
      baseState({
        startingCash: 100,
        revenue: [line({ fillMode: 'uniform', uniformAmount: 50 })],
        expenses: [line({ fillMode: 'uniform', uniformAmount: 40 })],
      }),
    )
    expect(buildMetrics(summaries, 100).runwayLabel).toBe('12+ months')
  })
})
