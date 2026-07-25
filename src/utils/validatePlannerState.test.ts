import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../types'
import { createDefaultState } from './defaults'
import {
  normalizeAmounts,
  parsePlannerJson,
  parsePlannerState,
  toFiniteNumber,
} from './validatePlannerState'

const legacyV1 = {
  businessName: 'Legacy Co',
  startMonth: 9,
  startYear: 2025,
  startingCash: 25000,
  revenue: [
    {
      id: 'r1',
      name: 'Sales',
      fillMode: 'growth',
      amounts: [1, 2],
      uniformAmount: 1000,
      growthPercent: 8,
    },
  ],
  expenses: [
    {
      id: 'e1',
      name: 'Salaries',
      fillMode: 'uniform',
      amounts: [],
      uniformAmount: 5000,
      growthPercent: 0,
    },
    {
      id: 'e2',
      name: 'Ads',
      fillMode: 'manual',
      amounts: [100, 200, Number.NaN],
      uniformAmount: 0,
      growthPercent: 0,
    },
  ],
}

describe('migrate legacy v1 plans', () => {
  it('wraps lines into Base scenario with USD and Other categories', () => {
    const result = parsePlannerState(legacyV1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.state.currency).toBe('USD')
    expect(result.state.scenarios).toHaveLength(1)
    expect(result.state.scenarios[0].name).toBe('Base')
    expect(result.state.businessName).toBe('Legacy Co')
    expect(result.state.startingCash).toBe(25000)
    expect(result.state.startMonth).toBe(9)
    expect(result.state.scenarios[0].revenue[0].uniformAmount).toBe(1000)
    expect(result.state.scenarios[0].revenue[0].growthPercent).toBe(8)
    expect(result.state.scenarios[0].revenue[0].oneTimeMonth).toBe(0)
    expect(result.state.scenarios[0].expenses.every((e) => e.category === 'other')).toBe(
      true,
    )
    expect(result.state.scenarios[0].expenses[1].amounts).toHaveLength(12)
    expect(result.state.scenarios[0].expenses[1].amounts[2]).toBe(0)
  })

  it('round-trips migrated state through JSON', () => {
    const migrated = parsePlannerState(legacyV1)
    expect(migrated.ok).toBe(true)
    if (!migrated.ok) return
    const again = parsePlannerJson(JSON.stringify(migrated.state))
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.state.scenarios[0].revenue[0].name).toBe('Sales')
    expect(again.state.scenarios[0].expenses[0].uniformAmount).toBe(5000)
  })
})

describe('schema v2 validation', () => {
  it('accepts multi-scenario plans and currency', () => {
    const fresh = createDefaultState(new Date('2026-06-01'))
    fresh.currency = 'EUR'
    const result = parsePlannerState(JSON.parse(JSON.stringify(fresh)))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.currency).toBe('EUR')
    expect(result.state.scenarios[0].expenses[0].category).toBe('payroll')
  })

  it('normalizes one-time fields', () => {
    const result = parsePlannerState({
      schemaVersion: 2,
      businessName: 'X',
      startMonth: 0,
      startYear: 2026,
      startingCash: 0,
      currency: 'CAD',
      activeScenarioId: 's1',
      scenarios: [
        {
          id: 's1',
          name: 'Base',
          revenue: [
            {
              id: 'r',
              name: 'Launch',
              fillMode: 'one-time',
              uniformAmount: '900',
              growthPercent: 0,
              oneTimeMonth: '4',
              amounts: [],
            },
          ],
          expenses: [],
        },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.scenarios[0].revenue[0].fillMode).toBe('one-time')
    expect(result.state.scenarios[0].revenue[0].uniformAmount).toBe(900)
    expect(result.state.scenarios[0].revenue[0].oneTimeMonth).toBe(4)
  })

  it('rejects invalid roots and keeps helpers sane', () => {
    expect(parsePlannerState(null).ok).toBe(false)
    expect(parsePlannerJson('{').ok).toBe(false)
    expect(toFiniteNumber('nope', 3)).toBe(3)
    expect(normalizeAmounts([1])).toHaveLength(12)
  })

  it('falls back invalid one-time month on normalize', () => {
    const result = parsePlannerState({
      schemaVersion: 2,
      scenarios: [
        {
          id: 's',
          name: 'B',
          revenue: [
            {
              id: 'r',
              name: 'X',
              fillMode: 'one-time',
              uniformAmount: 10,
              oneTimeMonth: 40,
              amounts: [],
              growthPercent: 0,
            },
          ],
          expenses: [],
        },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.scenarios[0].revenue[0].oneTimeMonth).toBe(0)
  })
})
