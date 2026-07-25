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
  it('creates a blank scenario and switches to it', () => {
    const state = addBlankScenario(createDefaultState(new Date('2026-01-01')), 'Lean')
    expect(state.scenarios).toHaveLength(2)
    expect(getActiveScenario(state).name).toBe('Lean')
  })

  it('duplicates with independent deep copies and new ids', () => {
    let state = createDefaultState(new Date('2026-01-01'))
    const originalId = state.scenarios[0].id
    const lineId = state.scenarios[0].revenue[0].id
    const dup = duplicateActiveScenario(state)
    expect(dup.ok).toBe(true)
    if (!dup.ok) return
    state = dup.state
    const copy = state.scenarios.find((s) => s.id !== originalId)!
    expect(copy.revenue[0].id).not.toBe(lineId)
    copy.revenue[0].uniformAmount = 999
    expect(state.scenarios.find((s) => s.id === originalId)!.revenue[0].uniformAmount).not.toBe(
      999,
    )
  })

  it('renames, switches, and refuses deleting the last scenario', () => {
    let state = createDefaultState(new Date('2026-01-01'))
    state = addBlankScenario(state, 'Alt')
    const renamed = renameScenario(state, state.activeScenarioId, 'Optimistic')
    expect(renamed.ok).toBe(true)
    if (!renamed.ok) return
    state = renamed.state
    expect(getActiveScenario(state).name).toBe('Optimistic')

    const baseId = state.scenarios.find((s) => s.name === 'Base')!.id
    const switched = switchScenario(state, baseId)
    expect(switched.ok).toBe(true)
    if (!switched.ok) return
    state = switched.state

    const deleted = deleteScenario(state, state.activeScenarioId)
    expect(deleted.ok).toBe(true)
    if (!deleted.ok) return
    state = deleted.state
    expect(state.scenarios).toHaveLength(1)

    const last = deleteScenario(state, state.scenarios[0].id)
    expect(last.ok).toBe(false)
  })

  it('does not mutate sibling scenarios when updating active lines', () => {
    let state = createDefaultState(new Date('2026-01-01'))
    state = addBlankScenario(state, 'B')
    const aId = state.scenarios[0].id
    state = switchScenario(state, aId).ok
      ? (switchScenario(state, aId) as { ok: true; state: typeof state }).state
      : state

    // Ensure A is active
    const sw = switchScenario(state, aId)
    expect(sw.ok).toBe(true)
    if (!sw.ok) return
    state = sw.state

    const otherBefore = state.scenarios.find((s) => s.id !== aId)!.revenue[0].uniformAmount
    state = updateActiveScenario(state, (scenario) => ({
      ...scenario,
      revenue: scenario.revenue.map((r, i) =>
        i === 0 ? { ...r, uniformAmount: 1234 } : r,
      ),
    }))
    const otherAfter = state.scenarios.find((s) => s.id !== aId)!.revenue[0].uniformAmount
    expect(otherAfter).toBe(otherBefore)
    expect(getActiveScenario(state).revenue[0].uniformAmount).toBe(1234)
  })
})
