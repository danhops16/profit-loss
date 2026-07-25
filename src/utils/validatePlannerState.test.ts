import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../types'
import { createDefaultState, totalOpeningFunds } from './defaults'
import { parsePlannerJson, parsePlannerState } from './validatePlannerState'
import { buildSummariesForScenario, buildMetrics } from './calculations'

const legacyV2 = {
  schemaVersion: 2,
  businessName: "PTP's Lift & Fix",
  startMonth: 8,
  startYear: 2026,
  startingCash: 100000,
  currency: 'CAD',
  activeScenarioId: 'base',
  scenarios: [
    {
      id: 'base',
      name: 'Base',
      revenue: [
        {
          id: 'r1',
          name: 'rentals',
          fillMode: 'manual',
          amounts: [2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000],
          uniformAmount: 0,
          growthPercent: 0,
        },
      ],
      expenses: [
        {
          id: 'e1',
          name: 'Salaries',
          fillMode: 'uniform',
          amounts: [],
          uniformAmount: 4000,
          growthPercent: 0,
          category: 'payroll',
        },
        {
          id: 'e2',
          name: 'startup gear',
          fillMode: 'one-time',
          amounts: [],
          uniformAmount: 83000,
          growthPercent: 0,
          oneTimeMonth: 0,
          category: 'other',
        },
        {
          id: 'e3',
          name: 'loan',
          fillMode: 'uniform',
          amounts: [],
          uniformAmount: 500,
          growthPercent: 0,
          category: 'other',
        },
      ],
    },
  ],
}

describe('v2 → v3 migration', () => {
  it('preserves monetary values and migrates opening funds + cash purposes', () => {
    const result = parsePlannerState(legacyV2)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.state.currency).toBe('CAD')
    expect(totalOpeningFunds(result.state.openingFunds)).toBe(100000)
    expect(result.state.openingFunds[0].name).toBe('Opening funds')
    expect(result.state.openingFunds[0].type).toBe('other')
    expect(result.state.scenarios[0].expenses.find((e) => e.name === 'Salaries')?.cashPurpose).toBe(
      'operating',
    )
    // cogs would be direct; these are non-cogs so operating — user reclassifies startup/loan
    expect(result.state.scenarios[0].expenses.find((e) => e.name === 'startup gear')?.cashPurpose).toBe(
      'operating',
    )
    expect(result.state.scenarios[0].funding).toEqual([])

    const json = parsePlannerJson(JSON.stringify(result.state))
    expect(json.ok).toBe(true)
    if (!json.ok) return
    expect(json.state.scenarios[0].expenses[0].uniformAmount).toBe(4000)
  })

  it('after user reclassifies startup and loan, cash metrics match expected pattern', () => {
    const migrated = parsePlannerState(legacyV2)
    expect(migrated.ok).toBe(true)
    if (!migrated.ok) return
    const scenario = {
      ...migrated.state.scenarios[0],
      expenses: migrated.state.scenarios[0].expenses.map((e) => {
        if (e.name === 'startup gear') return { ...e, cashPurpose: 'startup' as const }
        if (e.name === 'loan') return { ...e, cashPurpose: 'loan_payment' as const }
        return e
      }),
    }
    const summaries = buildSummariesForScenario(
      scenario,
      migrated.state.startMonth,
      migrated.state.startYear,
      migrated.state.openingFunds,
      0,
    )
    const m0 = buildMetrics(summaries, migrated.state.openingFunds, 0)
    expect(m0.totalOpeningFunds).toBe(100000)
    // Sep: 100000 + 2000 - 4000 - 83000 - 500 = 14500
    expect(summaries[0].endingCash).toBe(14500)
    expect(m0.personalFundingRequired).toBe(0)

    const withBuffer = buildMetrics(summaries, migrated.state.openingFunds, 10000)
    expect(withBuffer.personalFundingRequired).toBe(
      Math.max(0, 10000 - withBuffer.lowestCash),
    )
  })
})

describe('defaults', () => {
  it('creates schema v3 default state', () => {
    const state = createDefaultState(new Date('2026-01-01'))
    expect(state.schemaVersion).toBe(3)
    expect(state.openingFunds).toHaveLength(1)
    expect(state.scenarios[0].notes).toBe('')
    expect(state.scenarios[0].funding).toEqual([])
  })
})
