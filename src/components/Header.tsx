import type { CurrencyCode, OpeningFundSource, OpeningFundType, PlannerState } from '../types'
import { CURRENCY_CODES, MONTHS, OPENING_FUND_TYPES, OPENING_FUND_TYPE_LABELS } from '../types'
import { createOpeningFund, totalOpeningFunds } from '../utils/defaults'
import { formatMoney } from '../utils/formatMoney'

interface HeaderProps {
  state: PlannerState
  onUpdate: (
    patch: Partial<
      Pick<
        PlannerState,
        'businessName' | 'startMonth' | 'startYear' | 'currency' | 'cashBuffer'
      >
    >,
  ) => void
  onOpeningFundsChange: (funds: OpeningFundSource[]) => void
}

export function Header({ state, onUpdate, onOpeningFundsChange }: HeaderProps) {
  const years = Array.from({ length: 5 }, (_, i) => state.startYear - 1 + i)
  const openingTotal = totalOpeningFunds(state.openingFunds)

  const updateFund = (id: string, patch: Partial<OpeningFundSource>) => {
    onOpeningFundsChange(
      state.openingFunds.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    )
  }

  return (
    <header className="header">
      <div>
        <h1>Year-One Startup Cash Planner</h1>
        <p className="subtitle">
          See how long your opening money lasts, what personal funding you may need, and
          whether operations can cover the bills.
        </p>
        <p className="disclaimer">
          Planning estimate only — not accounting, tax, inventory, or financial advice.
          Ending cash is cash remaining in the account, not “loan remaining.”
        </p>
      </div>

      <div className="setup-grid">
        <label className="field">
          <span>Business name</span>
          <input
            type="text"
            value={state.businessName}
            onChange={(e) => onUpdate({ businessName: e.target.value })}
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
        <label className="field">
          <span>Desired minimum cash buffer</span>
          <input
            type="number"
            step={100}
            value={state.cashBuffer}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) onUpdate({ cashBuffer: n })
            }}
          />
        </label>
      </div>
      <p className="currency-note">
        Currency changes formatting only — amounts are not converted.
      </p>

      <section className="opening-funds" aria-label="Opening funds">
        <div className="section-head">
          <h2>Opening funds</h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() =>
              onOpeningFundsChange([
                ...state.openingFunds,
                createOpeningFund('Additional opening funds', 'owner', 0),
              ])
            }
          >
            Add source
          </button>
        </div>
        <p className="cash-timing-note">
          Cash available at the start of forecast month one. Do not also enter money already
          spent before that date as a month-one cost.
        </p>
        <div className="opening-funds__list">
          {state.openingFunds.map((fund) => (
            <div key={fund.id} className="opening-fund-row">
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  value={fund.name}
                  onChange={(e) => updateFund(fund.id, { name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Type</span>
                <select
                  value={fund.type}
                  onChange={(e) =>
                    updateFund(fund.id, { type: e.target.value as OpeningFundType })
                  }
                >
                  {OPENING_FUND_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {OPENING_FUND_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Amount</span>
                <input
                  type="number"
                  step={100}
                  value={fund.amount}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n)) updateFund(fund.id, { amount: n })
                  }}
                />
              </label>
              {state.openingFunds.length > 1 && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm btn--danger"
                  onClick={() =>
                    onOpeningFundsChange(state.openingFunds.filter((f) => f.id !== fund.id))
                  }
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="opening-total">
          Total opening cash:{' '}
          <strong>{formatMoney(openingTotal, state.currency)}</strong>
        </p>
      </section>
    </header>
  )
}
