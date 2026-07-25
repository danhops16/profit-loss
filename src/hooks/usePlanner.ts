import { useCallback, useEffect, useState } from 'react'
import type { ExpenseCategory, ExpenseLineItem, LineItem, PlannerState } from '../types'
import {
  createDefaultState,
  createEmptyExpenseLineItem,
  createEmptyLineItem,
  getActiveScenario,
} from '../utils/defaults'
import {
  addBlankScenario,
  deleteScenario,
  duplicateActiveScenario,
  renameScenario,
  switchScenario,
  updateActiveScenario,
} from '../utils/scenarios'
import { parsePlannerJson, parsePlannerState } from '../utils/validatePlannerState'

export const STORAGE_KEY = 'profit-loss-planner-v1'

function loadState(): PlannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultState()
    const result = parsePlannerJson(raw)
    if (!result.ok) return createDefaultState()
    return result.state
  } catch {
    return createDefaultState()
  }
}

export function usePlanner() {
  const [state, setState] = useState<PlannerState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const activeScenario = getActiveScenario(state)

  const updateShared = useCallback(
    (patch: Partial<Pick<PlannerState, 'businessName' | 'startMonth' | 'startYear' | 'startingCash' | 'currency'>>) => {
      setState((prev) => ({ ...prev, ...patch }))
    },
    [],
  )

  const updateLineItem = useCallback(
    (kind: 'revenue' | 'expenses', id: string, patch: Partial<LineItem | ExpenseLineItem>) => {
      setState((prev) =>
        updateActiveScenario(prev, (scenario) => {
          if (kind === 'revenue') {
            return {
              ...scenario,
              revenue: scenario.revenue.map((item) => {
                if (item.id !== id) return item
                const next: LineItem = { ...item, ...patch }
                if (patch.amounts) next.amounts = [...patch.amounts]
                return next
              }),
            }
          }
          return {
            ...scenario,
            expenses: scenario.expenses.map((item) => {
              if (item.id !== id) return item
              const next: ExpenseLineItem = { ...item, ...patch }
              if (patch.amounts) next.amounts = [...patch.amounts]
              return next
            }),
          }
        }),
      )
    },
    [],
  )

  const addLineItem = useCallback(
    (kind: 'revenue' | 'expenses', name = '', category?: ExpenseCategory) => {
      setState((prev) =>
        updateActiveScenario(prev, (scenario) => {
          if (kind === 'revenue') {
            return {
              ...scenario,
              revenue: [...scenario.revenue, createEmptyLineItem(name)],
            }
          }
          return {
            ...scenario,
            expenses: [
              ...scenario.expenses,
              createEmptyExpenseLineItem(name, category ?? 'other'),
            ],
          }
        }),
      )
    },
    [],
  )

  const removeLineItem = useCallback((kind: 'revenue' | 'expenses', id: string) => {
    setState((prev) =>
      updateActiveScenario(prev, (scenario) => {
        if (kind === 'revenue') {
          return {
            ...scenario,
            revenue: scenario.revenue.filter((item) => item.id !== id),
          }
        }
        return {
          ...scenario,
          expenses: scenario.expenses.filter((item) => item.id !== id),
        }
      }),
    )
  }, [])

  const reset = useCallback(() => {
    if (confirm('Reset all data to defaults? This cannot be undone.')) {
      setState(createDefaultState())
    }
  }, [])

  const importState = useCallback((data: unknown): string | null => {
    const result = parsePlannerState(data)
    if (!result.ok) return result.error
    setState(result.state)
    return null
  }, [])

  const createScenario = useCallback((name?: string) => {
    setState((prev) => addBlankScenario(prev, name))
  }, [])

  const duplicateScenario = useCallback((): string | null => {
    let error: string | null = null
    setState((prev) => {
      const result = duplicateActiveScenario(prev)
      if (!result.ok) {
        error = result.error
        return prev
      }
      return result.state
    })
    return error
  }, [])

  const renameActiveScenario = useCallback((name: string): string | null => {
    let error: string | null = null
    setState((prev) => {
      const result = renameScenario(prev, prev.activeScenarioId, name)
      if (!result.ok) {
        error = result.error
        return prev
      }
      return result.state
    })
    return error
  }, [])

  const selectScenario = useCallback((id: string): string | null => {
    let error: string | null = null
    setState((prev) => {
      const result = switchScenario(prev, id)
      if (!result.ok) {
        error = result.error
        return prev
      }
      return result.state
    })
    return error
  }, [])

  const removeScenario = useCallback((id: string): string | null => {
    let error: string | null = null
    setState((prev) => {
      const result = deleteScenario(prev, id)
      if (!result.ok) {
        error = result.error
        return prev
      }
      return result.state
    })
    return error
  }, [])

  return {
    state,
    activeScenario,
    updateShared,
    updateLineItem,
    addLineItem,
    removeLineItem,
    reset,
    importState,
    createScenario,
    duplicateScenario,
    renameActiveScenario,
    selectScenario,
    removeScenario,
  }
}
