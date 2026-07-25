import { describe, expect, it } from 'vitest'
import { createDefaultState } from './defaults'
import {
  normalizeAmounts,
  parsePlannerJson,
  parsePlannerState,
  toFiniteNumber,
} from './validatePlannerState'

describe('toFiniteNumber', () => {
  it('keeps finite numbers', () => {
    expect(toFiniteNumber(12.5)).toBe(12.5)
  })

  it('parses numeric strings', () => {
    expect(toFiniteNumber('42')).toBe(42)
  })

  it('falls back for non-finite and junk', () => {
    expect(toFiniteNumber(Number.NaN, 7)).toBe(7)
    expect(toFiniteNumber(Number.POSITIVE_INFINITY, 7)).toBe(7)
    expect(toFiniteNumber('nope', 7)).toBe(7)
    expect(toFiniteNumber(undefined, 7)).toBe(7)
  })
})

describe('normalizeAmounts', () => {
  it('pads and truncates to exactly 12 finite numbers', () => {
    expect(normalizeAmounts([1, 2])).toEqual([
      1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
    expect(normalizeAmounts(Array.from({ length: 20 }, (_, i) => i))).toHaveLength(12)
  })

  it('replaces non-finite values with 0', () => {
    expect(normalizeAmounts([1, Number.NaN, '3', null])).toEqual([
      1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
  })
})

describe('parsePlannerState', () => {
  it('accepts a valid plan and normalizes amounts', () => {
    const result = parsePlannerState({
      businessName: 'Acme',
      startMonth: 3,
      startYear: 2026,
      startingCash: 5000,
      revenue: [
        {
          id: 'r1',
          name: 'Sales',
          fillMode: 'manual',
          amounts: [100],
          uniformAmount: 0,
          growthPercent: 0,
        },
      ],
      expenses: [],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.businessName).toBe('Acme')
    expect(result.state.revenue[0].amounts).toHaveLength(12)
    expect(result.state.revenue[0].amounts[0]).toBe(100)
  })

  it('preserves older plans with string numbers and unknown fillMode', () => {
    const result = parsePlannerState({
      businessName: 'Legacy',
      startMonth: '5',
      startYear: '2024',
      startingCash: '1000',
      revenue: [
        {
          id: 'x',
          name: 'A',
          fillMode: 'mystery',
          amounts: ['10', '20'],
          uniformAmount: '30',
          growthPercent: '0',
        },
      ],
      expenses: [],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.startMonth).toBe(5)
    expect(result.state.startYear).toBe(2024)
    expect(result.state.startingCash).toBe(1000)
    expect(result.state.revenue[0].fillMode).toBe('uniform')
    expect(result.state.revenue[0].uniformAmount).toBe(30)
    expect(result.state.revenue[0].amounts[0]).toBe(10)
  })

  it('rejects non-objects and missing arrays', () => {
    expect(parsePlannerState(null).ok).toBe(false)
    expect(parsePlannerState('nope').ok).toBe(false)
    expect(parsePlannerState({ revenue: [], expenses: 'bad' }).ok).toBe(false)
    expect(parsePlannerState({ revenue: 'bad', expenses: [] }).ok).toBe(false)
  })

  it('rejects arrays that contain only non-objects', () => {
    const result = parsePlannerState({
      revenue: [1, 2, 3],
      expenses: [],
    })
    expect(result.ok).toBe(false)
  })

  it('clamps invalid months and years to safe fallbacks', () => {
    const result = parsePlannerState({
      startMonth: 99,
      startYear: 1200,
      revenue: [],
      expenses: [],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.startMonth).toBe(0)
    expect(result.state.startYear).toBe(new Date().getFullYear())
  })

  it('allows empty revenue and expenses arrays', () => {
    const result = parsePlannerState({ revenue: [], expenses: [] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.revenue).toEqual([])
    expect(result.state.expenses).toEqual([])
  })
})

describe('parsePlannerJson', () => {
  it('returns a clear error for invalid JSON', () => {
    const result = parsePlannerJson('{')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/valid planner export/i)
  })

  it('round-trips a default state export', () => {
    const state = createDefaultState(new Date('2026-01-15T00:00:00Z'))
    const result = parsePlannerJson(JSON.stringify(state))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.businessName).toBe(state.businessName)
    expect(result.state.revenue).toHaveLength(state.revenue.length)
  })
})
