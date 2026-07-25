import { useId, useRef, useState } from 'react'
import type { PlannerState } from '../types'
import { parsePlannerJson } from '../utils/validatePlannerState'

interface ExportBarProps {
  state: PlannerState
  onImport: (data: unknown) => string | null
  onReset: () => void
}

export function ExportBar({ state, onImport, onReset }: ExportBarProps) {
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
    a.download = `${state.businessName.replace(/\s+/g, '-').toLowerCase() || 'planner'}-year1.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus({ tone: 'success', message: 'Plan exported as JSON.' })
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
    reader.onerror = () => {
      setStatus({
        tone: 'error',
        message: 'Could not read that file. Please try again.',
      })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <footer className="export-bar">
      <div className="export-bar__copy">
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
          Reset
        </button>
      </div>
    </footer>
  )
}
