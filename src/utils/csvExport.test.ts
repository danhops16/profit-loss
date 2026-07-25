import { describe, expect, it } from 'vitest'
import type { Scenario } from '../types'
import { SCHEMA_VERSION } from '../types'
import { buildActiveScenarioCsv, csvFilename } from './csvExport'
import { createEmptyExpenseLineItem, createEmptyLineItem } from './defaults'

describe('csvExport', () => {
  it('escapes commas, quotes, and newlines in headers/cells', () => {
    const scenario: Scenario = {
      id: 's',
      name: 'Base',
      revenue: [
        {
          ...createEmptyLineItem('Sales, "core"'),
          fillMode: 'uniform',
          uniformAmount: 100,
        },
        {
          ...createEmptyLineItem('Sales'),
          fillMode: 'uniform',
          uniformAmount: 50,
        },
        {
          ...createEmptyLineItem('Sales'),
          fillMode: 'uniform',
          uniformAmount: 25,
        },
      ],
      expenses: [
        {
          ...createEmptyExpenseLineItem('Materials\nbulk', 'cogs'),
          fillMode: 'uniform',
          uniformAmount: 40,
        },
        {
          ...createEmptyExpenseLineItem('Payroll', 'payroll'),
          fillMode: 'uniform',
          uniformAmount: 30,
        },
      ],
    }

    const state = {
      schemaVersion: SCHEMA_VERSION,
      businessName: 'Acme, Inc',
      startMonth: 0,
      startYear: 2026,
      startingCash: 1000,
      currency: 'USD' as const,
      activeScenarioId: 's',
      scenarios: [scenario],
    }

    const csv = buildActiveScenarioCsv(state, scenario)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"Revenue: Sales, ""core"""')
    expect(csv).toContain('Revenue: Sales')
    expect(csv).toContain('Revenue: Sales (2)')
    expect(csv).toContain('"COGS: Materials\nbulk"')
    expect(csv).toContain('Total revenue')
    expect(csv).toContain('Gross margin')
    expect(csv).toContain('Ending cash')
    expect(csvFilename(state, scenario)).toBe('acme,-inc-base-2026-01.csv')
  })
})
