import { describe, expect, it } from 'vitest'
import { createDefaultState, getActiveScenario } from './defaults'
import {
  addBlankScenario,
  deleteScenario,
  duplicateActiveScenario,
  renameScenario,
  switchScenario,
  updateActiveScenario,
} from './scenarios'

describe('scenarios', () => {
  it('duplicates independently and refuses deleting the last scenario', () => {
    let state = createDefaultState(new Date('2026-01-01'))
    const originalId = state.scenarios[0].id
    const lineId = state.scenarios[0].revenue[0].id
    const dup = duplicateActiveScenario(state)
    expect(dup.ok).toBe(true)
    if (!dup.ok) return
    state = dup.state
    const copy = state.scenarios.find((s) => s.id !== originalId)!
    expect(copy.revenue[0].id).not.toBe(lineId)
    copy.notes = 'downside'
    expect(state.scenarios.find((s) => s.id === originalId)!.notes).toBe('')

    state = updateActiveScenario(state, (s) => ({
      ...s,
      revenue: s.revenue.map((r, i) => (i === 0 ? { ...r, uniformAmount: 42 } : r)),
    }))
    expect(getActiveScenario(state).revenue[0].uniformAmount).toBe(42)

    const other = state.scenarios.find((s) => s.id !== state.activeScenarioId)!
    expect(other.revenue[0].uniformAmount).not.toBe(42)

    const deleted = deleteScenario(state, state.activeScenarioId)
    expect(deleted.ok).toBe(true)
    if (!deleted.ok) return
    state = deleted.state
    expect(deleteScenario(state, state.scenarios[0].id).ok).toBe(false)
  })

  it('renames and switches', () => {
    let state = addBlankScenario(createDefaultState(new Date('2026-01-01')), 'Downside')
    const renamed = renameScenario(state, state.activeScenarioId, 'Upside')
    expect(renamed.ok).toBe(true)
    if (!renamed.ok) return
    state = renamed.state
    expect(getActiveScenario(state).name).toBe('Upside')
    const base = state.scenarios.find((s) => s.name === 'Base')!
    expect(switchScenario(state, base.id).ok).toBe(true)
  })
})
