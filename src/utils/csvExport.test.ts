import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../types'
import { buildActiveScenarioCsv, csvFilename } from './csvExport'
import {
  createEmptyExpenseLineItem,
  createEmptyLineItem,
  createOpeningFund,
} from './defaults'

describe('csvExport', () => {
  it('escapes values and includes cash columns', () => {
    const scenario = {
      id: 's',
      name: 'Base',
      notes: '',
      revenue: [
        { ...createEmptyLineItem('Sales, "core"'), fillMode: 'uniform' as const, uniformAmount: 100 },
      ],
      expenses: [
        {
          ...createEmptyExpenseLineItem('Materials\nbulk', 'direct', 'cogs'),
          fillMode: 'uniform' as const,
          uniformAmount: 40,
        },
      ],
      funding: [],
    }
    const state = {
      schemaVersion: SCHEMA_VERSION,
      businessName: 'Acme',
      startMonth: 0,
      startYear: 2026,
      currency: 'USD' as const,
      cashBuffer: 0,
      openingFunds: [createOpeningFund('Opening funds', 'other', 1000)],
      activeScenarioId: 's',
      scenarios: [scenario],
    }
    const csv = buildActiveScenarioCsv(state, scenario)
    expect(csv).toContain('Ending cash')
    expect(csv).toContain('Operating profit')
    expect(csv).toContain('"Revenue: Sales, ""core"""')
    expect(csvFilename(state, scenario)).toContain('acme-base-2026-01')
  })
})
