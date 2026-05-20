import { useRef } from 'react'
import type { PlannerState } from '../types'

interface ExportBarProps {
  state: PlannerState
  onImport: (state: PlannerState) => void
  onReset: () => void
}

export function ExportBar({ state, onImport, onReset }: ExportBarProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${state.businessName.replace(/\s+/g, '-').toLowerCase() || 'planner'}-year1.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as PlannerState
        onImport(data)
      } catch {
        alert('Could not read that file. Please use a planner export (.json).')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <footer className="export-bar">
      <p>Your plan saves automatically in this browser.</p>
      <div className="export-actions">
        <button type="button" className="btn btn--ghost" onClick={exportJson}>
          Export JSON
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleFile}
        />
        <button type="button" className="btn btn--ghost btn--danger" onClick={onReset}>
          Reset
        </button>
      </div>
    </footer>
  )
}
