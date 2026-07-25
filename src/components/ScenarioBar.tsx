import type { Scenario } from '../types'

interface ScenarioBarProps {
  scenarios: Scenario[]
  activeScenarioId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onDuplicate: () => void
  onRename: (name: string) => void
  onDelete: (id: string) => void
  onNotesChange: (notes: string) => void
  statusMessage?: string | null
}

export function ScenarioBar({
  scenarios,
  activeScenarioId,
  onSelect,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
  onNotesChange,
  statusMessage,
}: ScenarioBarProps) {
  const active = scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0]

  return (
    <section className="scenario-bar" aria-label="Forecast scenarios">
      <div className="scenario-bar__row">
        <label className="field scenario-select">
          <span>Scenario</span>
          <select
            value={activeScenarioId}
            onChange={(e) => onSelect(e.target.value)}
            aria-label="Active scenario"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field scenario-rename">
          <span>Rename</span>
          <input
            type="text"
            defaultValue={active?.name ?? ''}
            key={active?.id}
            onBlur={(e) => onRename(e.target.value)}
            aria-label="Rename active scenario"
          />
        </label>
        <div className="scenario-actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCreate}>
            New blank
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={onDuplicate}>
            Duplicate Base to create a Downside or Upside scenario
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--danger"
            disabled={scenarios.length <= 1}
            onClick={() => {
              if (!active) return
              if (confirm(`Delete scenario “${active.name}”? This cannot be undone.`)) {
                onDelete(active.id)
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <label className="field scenario-notes">
        <span>Assumptions / notes</span>
        <textarea
          key={active?.id}
          defaultValue={active?.notes ?? ''}
          onBlur={(e) => onNotesChange(e.target.value)}
          rows={2}
          placeholder="e.g. Revenue starts two months later; startup costs 10% higher"
        />
      </label>
      {statusMessage ? (
        <p className="export-status export-status--error" role="status" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
    </section>
  )
}
