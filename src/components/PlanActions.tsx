import { useId, useRef, useState } from 'react'
import type { PlannerState } from '../types'
import { buildActiveScenarioCsv, csvFilename, downloadTextFile } from '../utils/csvExport'
import { getActiveScenario } from '../utils/defaults'
import { parsePlannerJson } from '../utils/validatePlannerState'

interface PlanActionsProps {
  state: PlannerState
  onImport: (data: unknown) => string | null
  onReset: () => void
}

export function PlanActions({ state, onImport, onReset }: PlanActionsProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const statusId = useId()
  const [status, setStatus] = useState<{ tone: 'error' | 'success'; message: string } | null>(
    null,
  )

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const scenario = getActiveScenario(state)
    a.download = `${state.businessName.replace(/\s+/g, '-').toLowerCase() || 'planner'}-${scenario.name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus({ tone: 'success', message: 'Plan exported as JSON.' })
  }

  const exportCsv = () => {
    const scenario = getActiveScenario(state)
    downloadTextFile(
      csvFilename(state, scenario),
      buildActiveScenarioCsv(state, scenario),
      'text/csv;charset=utf-8',
    )
    setStatus({ tone: 'success', message: 'Active scenario exported as CSV.' })
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const parsed = parsePlannerJson(text)
      if (!parsed.ok) {
        setStatus({ tone: 'error', message: parsed.error })
        return
      }
      const error = onImport(parsed.state)
      if (error) {
        setStatus({ tone: 'error', message: error })
        return
      }
      setStatus({ tone: 'success', message: 'Plan imported successfully.' })
    }
    reader.onerror = () =>
      setStatus({ tone: 'error', message: 'Could not read that file. Please try again.' })
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <section className="plan-actions" aria-label="Plan actions">
      <div className="plan-actions__copy">
        <h2>Plan actions</h2>
        <p>Your plan saves automatically in this browser.</p>
        <p
          id={statusId}
          className={`export-status export-status--${status?.tone ?? 'idle'}`}
          role="status"
          aria-live="polite"
        >
          {status?.message ?? ''}
        </p>
      </div>
      <div className="export-actions">
        <button type="button" className="btn btn--ghost" onClick={exportJson}>
          Export JSON
        </button>
        <button type="button" className="btn btn--ghost" onClick={exportCsv}>
          Export CSV
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => fileRef.current?.click()}
          aria-describedby={statusId}
        >
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Choose a planner JSON file to import"
          onChange={handleFile}
        />
        <button type="button" className="btn btn--ghost btn--danger" onClick={onReset}>
          Reset plan
        </button>
      </div>
    </section>
  )
}
