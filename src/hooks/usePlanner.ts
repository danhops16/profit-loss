import { useCallback, useEffect, useState } from 'react'
import type { LineItem, PlannerState } from '../types'
import { createDefaultState, createEmptyLineItem } from '../utils/defaults'
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

  const update = useCallback((patch: Partial<PlannerState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const updateLineItem = useCallback(
    (kind: 'revenue' | 'expenses', id: string, patch: Partial<LineItem>) => {
      setState((prev) => ({
        ...prev,
        [kind]: prev[kind].map((item) => {
          if (item.id !== id) return item
          const next: LineItem = { ...item, ...patch }
          if (patch.amounts) {
            next.amounts = [...patch.amounts]
          }
          return next
        }),
      }))
    },
    [],
  )

  const addLineItem = useCallback((kind: 'revenue' | 'expenses', name = '') => {
    setState((prev) => ({
      ...prev,
      [kind]: [...prev[kind], createEmptyLineItem(name)],
    }))
  }, [])

  const removeLineItem = useCallback((kind: 'revenue' | 'expenses', id: string) => {
    setState((prev) => ({
      ...prev,
      [kind]: prev[kind].filter((item) => item.id !== id),
    }))
  }, [])

  const reset = useCallback(() => {
    if (confirm('Reset all data to defaults? This cannot be undone.')) {
      setState(createDefaultState())
    }
  }, [])

  /**
   * Import untrusted data. Returns null on success, or an error message
   * without changing the current plan when validation fails.
   */
  const importState = useCallback((data: unknown): string | null => {
    const result = parsePlannerState(data)
    if (!result.ok) return result.error
    setState(result.state)
    return null
  }, [])

  return {
    state,
    update,
    updateLineItem,
    addLineItem,
    removeLineItem,
    reset,
    importState,
  }
}
