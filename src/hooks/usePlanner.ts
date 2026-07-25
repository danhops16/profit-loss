import { useCallback, useEffect, useState } from 'react'
import type {
  CashPurpose,
  ExpenseCategory,
  ExpenseLineItem,
  FundingLineItem,
  FundingType,
  LineItem,
  OpeningFundSource,
  PlannerState,
} from '../types'
import {
  createDefaultState,
  createEmptyExpenseLineItem,
  createEmptyFundingLineItem,
  createEmptyLineItem,
  createOpeningFund,
  getActiveScenario,
} from '../utils/defaults'
import {
  addBlankScenario,
  deleteScenario,
  duplicateActiveScenario,
  renameScenario,
  switchScenario,
  updateActiveScenario,
  updateScenarioNotes,
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
  const [basisFallbackMessage, setBasisFallbackMessage] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const activeScenario = getActiveScenario(state)

  const updateShared = useCallback(
    (
      patch: Partial<
        Pick<
          PlannerState,
          | 'businessName'
          | 'startMonth'
          | 'startYear'
          | 'currency'
          | 'cashBuffer'
          | 'openingFunds'
        >
      >,
    ) => {
      setState((prev) => ({ ...prev, ...patch }))
    },
    [],
  )

  const setOpeningFunds = useCallback((funds: OpeningFundSource[]) => {
    setState((prev) => ({ ...prev, openingFunds: funds }))
  }, [])

  const updateLineItem = useCallback(
    (
      kind: 'revenue' | 'expenses' | 'funding',
      id: string,
      patch: Partial<LineItem | ExpenseLineItem | FundingLineItem>,
    ) => {
      setState((prev) =>
        updateActiveScenario(prev, (scenario) => {
          if (kind === 'revenue') {
            return {
              ...scenario,
              revenue: scenario.revenue.map((item) => {
                if (item.id !== id) return item
                const next = { ...item, ...patch } as LineItem
                if (patch.amounts) next.amounts = [...patch.amounts]
                return next
              }),
            }
          }
          if (kind === 'funding') {
            return {
              ...scenario,
              funding: scenario.funding.map((item) => {
                if (item.id !== id) return item
                const next = { ...item, ...patch } as FundingLineItem
                if (patch.amounts) next.amounts = [...patch.amounts]
                return next
              }),
            }
          }
          return {
            ...scenario,
            expenses: scenario.expenses.map((item) => {
              if (item.id !== id) return item
              const next = { ...item, ...patch } as ExpenseLineItem
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
    (
      kind: 'revenue' | 'expenses' | 'funding',
      name = '',
      opts?: { cashPurpose?: CashPurpose; category?: ExpenseCategory; fundingType?: FundingType },
    ) => {
      let newId = ''
      setState((prev) =>
        updateActiveScenario(prev, (scenario) => {
          if (kind === 'revenue') {
            const item = createEmptyLineItem(name)
            newId = item.id
            return { ...scenario, revenue: [...scenario.revenue, item] }
          }
          if (kind === 'funding') {
            const item = createEmptyFundingLineItem(name, opts?.fundingType ?? 'owner')
            newId = item.id
            return { ...scenario, funding: [...scenario.funding, item] }
          }
          const item = createEmptyExpenseLineItem(
            name,
            opts?.cashPurpose ?? 'operating',
            opts?.category ?? 'other',
          )
          newId = item.id
          return { ...scenario, expenses: [...scenario.expenses, item] }
        }),
      )
      return newId
    },
    [],
  )

  const duplicateLineItem = useCallback(
    (kind: 'revenue' | 'expenses' | 'funding', id: string) => {
      let newId = ''
      setState((prev) =>
        updateActiveScenario(prev, (scenario) => {
          if (kind === 'revenue') {
            const src = scenario.revenue.find((r) => r.id === id)
            if (!src) return scenario
            const copy = { ...src, id: createEmptyLineItem().id, amounts: [...src.amounts] }
            newId = copy.id
            return { ...scenario, revenue: [...scenario.revenue, copy] }
          }
          if (kind === 'funding') {
            const src = scenario.funding.find((r) => r.id === id)
            if (!src) return scenario
            const copy = {
              ...src,
              id: createEmptyFundingLineItem().id,
              amounts: [...src.amounts],
            }
            newId = copy.id
            return { ...scenario, funding: [...scenario.funding, copy] }
          }
          const src = scenario.expenses.find((r) => r.id === id)
          if (!src) return scenario
          const copy = {
            ...src,
            id: createEmptyExpenseLineItem().id,
            amounts: [...src.amounts],
          }
          newId = copy.id
          return { ...scenario, expenses: [...scenario.expenses, copy] }
        }),
      )
      return newId
    },
    [],
  )

  const removeLineItem = useCallback((kind: 'revenue' | 'expenses' | 'funding', id: string) => {
    setState((prev) =>
      updateActiveScenario(prev, (scenario) => {
        if (kind === 'revenue') {
          const revenue = scenario.revenue.filter((i) => i.id !== id)
          const revenueIds = new Set(revenue.map((r) => r.id))
          let fellBack = false
          const expenses = scenario.expenses.map((e) => {
            if (
              e.fillMode === 'percent-revenue' &&
              e.revenueBasisId &&
              !revenueIds.has(e.revenueBasisId)
            ) {
              fellBack = true
              return { ...e, revenueBasisId: null }
            }
            return e
          })
          if (fellBack) {
            queueMicrotask(() =>
              setBasisFallbackMessage(
                'A % of revenue cost lost its revenue line and now uses total revenue.',
              ),
            )
          }
          return { ...scenario, revenue, expenses }
        }
        if (kind === 'funding') {
          return { ...scenario, funding: scenario.funding.filter((i) => i.id !== id) }
        }
        return { ...scenario, expenses: scenario.expenses.filter((i) => i.id !== id) }
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

  const setActiveNotes = useCallback((notes: string) => {
    setState((prev) => updateScenarioNotes(prev, prev.activeScenarioId, notes))
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
    basisFallbackMessage,
    clearBasisFallbackMessage: () => setBasisFallbackMessage(null),
    updateShared,
    setOpeningFunds,
    updateLineItem,
    addLineItem,
    duplicateLineItem,
    removeLineItem,
    reset,
    importState,
    createScenario,
    duplicateScenario,
    renameActiveScenario,
    setActiveNotes,
    selectScenario,
    removeScenario,
    createOpeningFund,
  }
}
