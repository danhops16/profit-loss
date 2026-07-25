import { useState } from 'react'
import { Charts } from './components/Charts'
import { Dashboard } from './components/Dashboard'
import { ExportBar } from './components/ExportBar'
import { Header } from './components/Header'
import { LineItemSection } from './components/LineItemSection'
import { MonthlyTable } from './components/MonthlyTable'
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
import type { ExpenseCategory } from './types'
import './App.css'

const EXPENSE_PRESETS: Array<{ name: string; category: ExpenseCategory }> = [
  { name: 'Cost of goods', category: 'cogs' },
  { name: 'Contractors', category: 'professional' },
  { name: 'Insurance', category: 'other' },
  { name: 'Legal & accounting', category: 'professional' },
  { name: 'Travel', category: 'other' },
  { name: 'Office supplies', category: 'other' },
]

const REVENUE_PRESETS = [
  { name: 'Subscriptions' },
  { name: 'Services' },
  { name: 'Licensing' },
  { name: 'Other income' },
]

function App() {
  const {
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
  } = usePlanner()

  const [scenarioStatus, setScenarioStatus] = useState<string | null>(null)
  const summaries = buildSummaries(state)
  const metrics = buildMetrics(summaries, state.startingCash)
  const monthLabels = forecastMonthLabels(state.startMonth, state.startYear)
  const comparison = compareScenarios(state)

  return (
    <div className="app">
      <Header state={state} onUpdate={updateShared} />

      <ScenarioBar
        scenarios={state.scenarios}
        activeScenarioId={state.activeScenarioId}
        statusMessage={scenarioStatus}
        onSelect={(id) => {
          const err = selectScenario(id)
          setScenarioStatus(err)
        }}
        onCreate={() => {
          createScenario()
          setScenarioStatus(null)
        }}
        onDuplicate={() => {
          setScenarioStatus(duplicateScenario())
        }}
        onRename={(name) => {
          setScenarioStatus(renameActiveScenario(name))
        }}
        onDelete={(id) => {
          setScenarioStatus(removeScenario(id))
        }}
      />

      <StickySummary
        scenarioName={activeScenario.name}
        currency={state.currency}
        metrics={metrics}
      />

      <Dashboard
        businessName={state.businessName}
        currency={state.currency}
        summaries={summaries}
        metrics={metrics}
      />

      <main className="main-grid">
        <LineItemSection
          title="Revenue"
          kind="revenue"
          items={activeScenario.revenue}
          accent="green"
          monthLabels={monthLabels}
          currency={state.currency}
          presets={REVENUE_PRESETS}
          onAdd={(name) => addLineItem('revenue', name)}
          onRemove={(id) => removeLineItem('revenue', id)}
          onUpdate={(id, patch) => updateLineItem('revenue', id, patch)}
        />
        <LineItemSection
          title="Expenses"
          kind="expenses"
          items={activeScenario.expenses}
          accent="red"
          monthLabels={monthLabels}
          currency={state.currency}
          presets={EXPENSE_PRESETS}
          onAdd={(name, category) => addLineItem('expenses', name, category)}
          onRemove={(id) => removeLineItem('expenses', id)}
          onUpdate={(id, patch) => updateLineItem('expenses', id, patch)}
        />
      </main>

      <Charts summaries={summaries} />
      <MonthlyTable summaries={summaries} currency={state.currency} />
      <ScenarioCompare
        rows={comparison}
        currency={state.currency}
        activeScenarioId={state.activeScenarioId}
      />
      <ExportBar state={state} onImport={importState} onReset={reset} />
    </div>
  )
}

export default App
