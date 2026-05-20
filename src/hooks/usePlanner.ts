import { useCallback, useEffect, useState } from 'react'
import type { LineItem, PlannerState } from '../types'

const STORAGE_KEY = 'profit-loss-planner-v1'

function createId(): string {
  return crypto.randomUUID()
}

function emptyLineItem(name = ''): LineItem {
  return {
    id: createId(),
    name,
    fillMode: 'uniform',
    amounts: Array(12).fill(0),
    uniformAmount: 0,
    growthPercent: 0,
  }
}

export const defaultState: PlannerState = {
  businessName: 'My Startup',
  startMonth: 0,
  startYear: new Date().getFullYear(),
  startingCash: 10000,
  revenue: [emptyLineItem('Product sales')],
  expenses: [
    emptyLineItem('Salaries'),
    emptyLineItem('Rent & utilities'),
    emptyLineItem('Marketing'),
    emptyLineItem('Software & tools'),
  ],
}

function loadState(): PlannerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as PlannerState
    return {
      ...defaultState,
      ...parsed,
      revenue: parsed.revenue?.length ? parsed.revenue : defaultState.revenue,
      expenses: parsed.expenses?.length ? parsed.expenses : defaultState.expenses,
    }
  } catch {
    return defaultState
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
      setState((prev) => {
        const key = kind
        return {
          ...prev,
          [key]: prev[key].map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        }
      })
    },
    [],
  )

  const addLineItem = useCallback((kind: 'revenue' | 'expenses', name = '') => {
    setState((prev) => ({
      ...prev,
      [kind]: [...prev[kind], emptyLineItem(name)],
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
      setState(defaultState)
    }
  }, [])

  const importState = useCallback((data: PlannerState) => {
    setState({ ...defaultState, ...data })
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
