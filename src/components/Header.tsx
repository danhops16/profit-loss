import type { CurrencyCode, PlannerState } from '../types'
import { CURRENCY_CODES, MONTHS } from '../types'

interface HeaderProps {
  state: PlannerState
  onUpdate: (
    patch: Partial<
      Pick<
        PlannerState,
        'businessName' | 'startMonth' | 'startYear' | 'startingCash' | 'currency'
      >
    >,
  ) => void
}

export function Header({ state, onUpdate }: HeaderProps) {
  const years = Array.from({ length: 5 }, (_, i) => state.startYear - 1 + i)

  return (
    <header className="header">
      <div>
        <h1>Year-one profit &amp; loss</h1>
        <p className="subtitle">
          Forecast revenue, costs, and cash for your first 12 months
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
            step={100}
            value={state.startingCash === 0 ? 0 : state.startingCash || ''}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '' || raw === '-') {
                onUpdate({ startingCash: raw === '-' ? state.startingCash : 0 })
                return
              }
              const n = Number(raw)
              if (Number.isFinite(n)) onUpdate({ startingCash: n })
            }}
          />
        </label>
        <label className="field">
          <span>Display currency</span>
          <select
            value={state.currency}
            onChange={(e) => onUpdate({ currency: e.target.value as CurrencyCode })}
          >
            {CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="currency-note">
        Currency changes formatting only — amounts are not converted.
      </p>
    </header>
  )
}
