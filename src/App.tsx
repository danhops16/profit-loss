import { useState } from 'react'
import { Charts } from './components/Charts'
import { Dashboard } from './components/Dashboard'
import { Header } from './components/Header'
import { LineWorkspace } from './components/LineWorkspace'
import { MonthlyCashTable } from './components/MonthlyCashTable'
import { PlanActions } from './components/PlanActions'
import { ScenarioBar } from './components/ScenarioBar'
import { ScenarioCompare } from './components/ScenarioCompare'
import { StickySummary } from './components/StickySummary'
import { usePlanner } from './hooks/usePlanner'
import {
  buildMetrics,
  buildSummaries,
  compareScenarios,
  forecastMonthLabels,
} from './utils/calculations'
import { totalOpeningFunds } from './utils/defaults'
import './App.css'

function App() {
  const {
    state,
    activeScenario,
    basisFallbackMessage,
    clearBasisFallbackMessage,
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
  } = usePlanner()

  const [scenarioStatus, setScenarioStatus] = useState<string | null>(null)

  const summaries = buildSummaries(state)
  const metrics = buildMetrics(summaries, state.openingFunds, state.cashBuffer)
  const monthLabels = forecastMonthLabels(state.startMonth, state.startYear)
  const comparison = compareScenarios(state)

  return (
    <div className="app">
      <Header
        state={state}
        onUpdate={updateShared}
        onOpeningFundsChange={setOpeningFunds}
      />

      <PlanActions state={state} onImport={importState} onReset={reset} />

      <ScenarioBar
        scenarios={state.scenarios}
        activeScenarioId={state.activeScenarioId}
        statusMessage={scenarioStatus}
        onSelect={(id) => setScenarioStatus(selectScenario(id))}
        onCreate={() => {
          createScenario()
          setScenarioStatus(null)
        }}
        onDuplicate={() => setScenarioStatus(duplicateScenario())}
        onRename={(name) => setScenarioStatus(renameActiveScenario(name))}
        onDelete={(id) => setScenarioStatus(removeScenario(id))}
        onNotesChange={setActiveNotes}
      />

      <StickySummary
        scenarioName={activeScenario.name}
        currency={state.currency}
        metrics={metrics}
      />

      {(basisFallbackMessage) ? (
        <p className="banner-status" role="status" aria-live="polite">
          {basisFallbackMessage}{' '}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={clearBasisFallbackMessage}
          >
            Dismiss
          </button>
        </p>
      ) : null}

      <Dashboard
        businessName={state.businessName}
        currency={state.currency}
        metrics={metrics}
      />

      <LineWorkspace
        currency={state.currency}
        monthLabels={monthLabels}
        revenue={activeScenario.revenue}
        expenses={activeScenario.expenses}
        funding={activeScenario.funding}
        onAdd={(kind, name, opts) => {
          const map = kind === 'costs' ? 'expenses' : kind
          return addLineItem(map, name, opts)
        }}
        onUpdate={(kind, id, patch) => {
          const map = kind === 'costs' ? 'expenses' : kind
          updateLineItem(map, id, patch)
        }}
        onDuplicate={(kind, id) => {
          const map = kind === 'costs' ? 'expenses' : kind
          return duplicateLineItem(map, id)
        }}
        onRemove={(kind, id) => {
          const map = kind === 'costs' ? 'expenses' : kind
          removeLineItem(map, id)
        }}
      />

      <Charts
        summaries={summaries}
        currency={state.currency}
        cashBuffer={state.cashBuffer}
        openingCash={totalOpeningFunds(state.openingFunds)}
      />
      <MonthlyCashTable summaries={summaries} currency={state.currency} />
      <ScenarioCompare
        rows={comparison}
        currency={state.currency}
        activeScenarioId={state.activeScenarioId}
      />
    </div>
  )
}

export default App
