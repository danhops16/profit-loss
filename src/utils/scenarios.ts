import type { PlannerState, Scenario } from '../types'
import {
  cloneScenario,
  createBlankScenario,
  createId,
} from './defaults'

export type ScenarioMutationResult =
  | { ok: true; state: PlannerState }
  | { ok: false; error: string }

function withActive(
  state: PlannerState,
  scenarios: Scenario[],
  activeScenarioId: string,
): PlannerState {
  const active =
    scenarios.find((s) => s.id === activeScenarioId)?.id ?? scenarios[0]?.id
  return {
    ...state,
    scenarios,
    activeScenarioId: active,
  }
}

export function addBlankScenario(state: PlannerState, name?: string): PlannerState {
  const scenario = createBlankScenario(name ?? `Scenario ${state.scenarios.length + 1}`)
  return withActive(state, [...state.scenarios, scenario], scenario.id)
}

export function duplicateActiveScenario(state: PlannerState): ScenarioMutationResult {
  const active = state.scenarios.find((s) => s.id === state.activeScenarioId)
  if (!active) return { ok: false, error: 'No active scenario to duplicate.' }
  const copy = cloneScenario(active)
  return {
    ok: true,
    state: withActive(state, [...state.scenarios, copy], copy.id),
  }
}

export function renameScenario(
  state: PlannerState,
  scenarioId: string,
  name: string,
): ScenarioMutationResult {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Scenario name cannot be empty.' }
  if (!state.scenarios.some((s) => s.id === scenarioId)) {
    return { ok: false, error: 'Scenario not found.' }
  }
  return {
    ok: true,
    state: {
      ...state,
      scenarios: state.scenarios.map((s) =>
        s.id === scenarioId ? { ...s, name: trimmed } : s,
      ),
    },
  }
}

export function switchScenario(
  state: PlannerState,
  scenarioId: string,
): ScenarioMutationResult {
  if (!state.scenarios.some((s) => s.id === scenarioId)) {
    return { ok: false, error: 'Scenario not found.' }
  }
  return { ok: true, state: { ...state, activeScenarioId: scenarioId } }
}

export function deleteScenario(
  state: PlannerState,
  scenarioId: string,
): ScenarioMutationResult {
  if (state.scenarios.length <= 1) {
    return { ok: false, error: 'The last scenario cannot be deleted.' }
  }
  if (!state.scenarios.some((s) => s.id === scenarioId)) {
    return { ok: false, error: 'Scenario not found.' }
  }
  const scenarios = state.scenarios.filter((s) => s.id !== scenarioId)
  const activeScenarioId =
    state.activeScenarioId === scenarioId ? scenarios[0].id : state.activeScenarioId
  return { ok: true, state: withActive(state, scenarios, activeScenarioId) }
}

export function updateActiveScenario(
  state: PlannerState,
  updater: (scenario: Scenario) => Scenario,
): PlannerState {
  return {
    ...state,
    scenarios: state.scenarios.map((s) =>
      s.id === state.activeScenarioId ? updater(s) : s,
    ),
  }
}

/** Ensure scenario IDs are unique after import edge cases. */
export function ensureUniqueScenarioIds(state: PlannerState): PlannerState {
  const seen = new Set<string>()
  const scenarios = state.scenarios.map((s) => {
    if (!seen.has(s.id)) {
      seen.add(s.id)
      return s
    }
    const id = createId()
    seen.add(id)
    return { ...s, id }
  })
  return withActive(state, scenarios, state.activeScenarioId)
}
