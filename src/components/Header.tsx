import type { PlannerState } from '../types'
import { MONTHS } from '../types'

interface HeaderProps {
  state: PlannerState
  onUpdate: (patch: Partial<PlannerState>) => void
}

export function Header({ state, onUpdate }: HeaderProps) {
  const years = Array.from({ length: 5 }, (_, i) => state.startYear - 1 + i)

  return (
    <header className="header">
      <div>
        <h1>Year-one profit &amp; loss</h1>
        <p className="subtitle">
          Model monthly revenue and costs for your first 12 months
        </p>
      </div>
      <div className="setup-grid">
        <label className="field">
          <span>Business name</span>
          <input
            type="text"
            value={state.businessName}
            onChange={(e) => onUpdate({ businessName: e.target.value })}
            placeholder="Acme Inc."
          />
        </label>
        <label className="field">
          <span>First month</span>
          <select
            value={state.startMonth}
            onChange={(e) => onUpdate({ startMonth: Number(e.target.value) })}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Year</span>
          <select
            value={state.startYear}
            onChange={(e) => onUpdate({ startYear: Number(e.target.value) })}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Starting cash</span>
          <input
            type="number"
            min={0}
            step={100}
            value={state.startingCash || ''}
            onChange={(e) =>
              onUpdate({ startingCash: Number(e.target.value) || 0 })
            }
          />
        </label>
      </div>
    </header>
  )
}
