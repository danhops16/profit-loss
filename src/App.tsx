import { Charts } from './components/Charts'
import { Dashboard } from './components/Dashboard'
import { ExportBar } from './components/ExportBar'
import { Header } from './components/Header'
import { LineItemSection } from './components/LineItemSection'
import { MonthlyTable } from './components/MonthlyTable'
import { usePlanner } from './hooks/usePlanner'
import { buildSummaries } from './utils/calculations'
import './App.css'

const EXPENSE_PRESETS = [
  'Contractors',
  'Insurance',
  'Legal & accounting',
  'Travel',
  'Office supplies',
]

const REVENUE_PRESETS = ['Subscriptions', 'Services', 'Licensing', 'Other income']

function App() {
  const { state, update, updateLineItem, addLineItem, removeLineItem, reset, importState } =
    usePlanner()
  const summaries = buildSummaries(state)

  return (
    <div className="app">
      <Header state={state} onUpdate={update} />

      <Dashboard
        businessName={state.businessName}
        summaries={summaries}
        startingCash={state.startingCash}
      />

      <main className="main-grid">
        <LineItemSection
          title="Revenue"
          kind="revenue"
          items={state.revenue}
          accent="green"
          presets={REVENUE_PRESETS}
          onAdd={(name) => addLineItem('revenue', name)}
          onRemove={(id) => removeLineItem('revenue', id)}
          onUpdate={(id, patch) => updateLineItem('revenue', id, patch)}
        />
        <LineItemSection
          title="Expenses"
          kind="expenses"
          items={state.expenses}
          accent="red"
          presets={EXPENSE_PRESETS}
          onAdd={(name) => addLineItem('expenses', name)}
          onRemove={(id) => removeLineItem('expenses', id)}
          onUpdate={(id, patch) => updateLineItem('expenses', id, patch)}
        />
      </main>

      <Charts summaries={summaries} />
      <MonthlyTable summaries={summaries} />
      <ExportBar state={state} onImport={importState} onReset={reset} />
    </div>
  )
}

export default App
