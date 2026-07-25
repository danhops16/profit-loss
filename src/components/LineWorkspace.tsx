import { useState } from 'react'
import type {
  CashPurpose,
  CurrencyCode,
  ExpenseCategory,
  ExpenseLineItem,
  FillMode,
  FundingLineItem,
  FundingType,
  LineItem,
} from '../types'
import {
  CASH_PURPOSES,
  CASH_PURPOSE_LABELS,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  OPENING_FUND_TYPE_LABELS,
} from '../types'
import {
  buildRevenueContext,
  modeSummary,
  resolveAmounts,
  roundCents,
} from '../utils/calculations'
import { formatMoney } from '../utils/formatMoney'

type EditorTab = 'revenue' | 'costs' | 'funding'

interface LineWorkspaceProps {
  currency: CurrencyCode
  monthLabels: string[]
  revenue: LineItem[]
  expenses: ExpenseLineItem[]
  funding: FundingLineItem[]
  openItemId: string | null
  onOpenItemId: (id: string | null) => void
  onAdd: (
    kind: EditorTab,
    name?: string,
    opts?: { cashPurpose?: CashPurpose; category?: ExpenseCategory; fundingType?: FundingType },
  ) => string
  onUpdate: (
    kind: EditorTab,
    id: string,
    patch: Partial<LineItem | ExpenseLineItem | FundingLineItem>,
  ) => void
  onDuplicate: (kind: EditorTab, id: string) => string
  onRemove: (kind: EditorTab, id: string) => void
}

const COST_PRESETS: Array<{ name: string; cashPurpose: CashPurpose; category: ExpenseCategory }> =
  [
    { name: 'Materials / COGS', cashPurpose: 'direct', category: 'cogs' },
    { name: 'Equipment / launch setup', cashPurpose: 'startup', category: 'other' },
    { name: 'Loan payment', cashPurpose: 'loan_payment', category: 'other' },
    { name: 'Contractors', cashPurpose: 'operating', category: 'professional' },
    { name: 'Insurance', cashPurpose: 'operating', category: 'other' },
  ]

export function LineWorkspace({
  currency,
  monthLabels,
  revenue,
  expenses,
  funding,
  openItemId,
  onOpenItemId,
  onAdd,
  onUpdate,
  onDuplicate,
  onRemove,
}: LineWorkspaceProps) {
  const [tab, setTab] = useState<EditorTab>('revenue')
  const money = (n: number) => formatMoney(n, currency)
  const context = buildRevenueContext(revenue)

  const items: Array<{
    kind: EditorTab
    item: LineItem | ExpenseLineItem | FundingLineItem
  }> =
    tab === 'revenue'
      ? revenue.map((item) => ({ kind: 'revenue' as const, item }))
      : tab === 'costs'
        ? expenses.map((item) => ({ kind: 'costs' as const, item }))
        : funding.map((item) => ({ kind: 'funding' as const, item }))

  return (
    <section className="line-workspace" aria-label="Forecast line items">
      <div className="workspace-tabs" role="tablist" aria-label="Line item groups">
        {(
          [
            ['revenue', 'Revenue'],
            ['costs', 'Costs'],
            ['funding', 'Additional funding'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`workspace-tab${tab === id ? ' is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="workspace-toolbar">
        <div className="section-actions">
          {tab === 'revenue' &&
            ['Subscriptions', 'Services', 'Other income'].map((name) => (
              <button
                key={name}
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onOpenItemId(onAdd('revenue', name))}
              >
                + {name}
              </button>
            ))}
          {tab === 'costs' &&
            COST_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() =>
                  onOpenItemId(
                    onAdd('costs', p.name, {
                      cashPurpose: p.cashPurpose,
                      category: p.category,
                    }),
                  )
                }
              >
                + {p.name}
              </button>
            ))}
          {tab === 'funding' && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onOpenItemId(onAdd('funding', 'Owner top-up', { fundingType: 'owner' }))}
            >
              + Owner top-up
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => onOpenItemId(onAdd(tab === 'costs' ? 'costs' : tab))}
          >
            Add line
          </button>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => onOpenItemId(null)}
        >
          Collapse all
        </button>
      </div>

      {tab === 'funding' && (
        <p className="cash-timing-note">
          Planned funding increases cash in the selected month. It does not count as revenue or
          operating profit.
        </p>
      )}

      {items.length === 0 ? (
        <p className="empty-hint">No lines yet. Add one to get started.</p>
      ) : (
        <div className="line-rows">
          {items.map(({ kind, item }) => {
            const amounts = resolveAmounts(item, context)
            const total = roundCents(amounts.reduce((a, b) => a + b, 0))
            const open = openItemId === item.id
            const expense = kind === 'costs' ? (item as ExpenseLineItem) : null
            const fund = kind === 'funding' ? (item as FundingLineItem) : null
            const purposeLabel = expense
              ? CASH_PURPOSE_LABELS[expense.cashPurpose]
              : fund
                ? OPENING_FUND_TYPE_LABELS[fund.fundingType]
                : 'Revenue'

            return (
              <article key={item.id} className={`line-row${open ? ' is-open' : ''}`}>
                <div className="line-row__summary">
                  <div className="line-row__meta">
                    <strong>{item.name || 'Untitled'}</strong>
                    <span className="meta-pill">{purposeLabel}</span>
                    <span className="meta-muted">{item.fillMode}</span>
                    <span className="meta-muted">
                      {modeSummary(item, monthLabels, money)}
                    </span>
                  </div>
                  <div className="line-row__actions">
                    <span className="line-total">{money(total)} · 12-mo total</span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => onOpenItemId(open ? null : item.id)}
                      aria-expanded={open}
                    >
                      {open ? 'Done' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => onOpenItemId(onDuplicate(kind, item.id))}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm btn--danger"
                      onClick={() => onRemove(kind, item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {open && (
                  <LineEditor
                    kind={kind}
                    item={item}
                    currency={currency}
                    monthLabels={monthLabels}
                    revenue={revenue}
                    onUpdate={(patch) => onUpdate(kind, item.id, patch)}
                  />
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function LineEditor({
  kind,
  item,
  currency,
  monthLabels,
  revenue,
  onUpdate,
}: {
  kind: EditorTab
  item: LineItem | ExpenseLineItem | FundingLineItem
  currency: CurrencyCode
  monthLabels: string[]
  revenue: LineItem[]
  onUpdate: (patch: Partial<LineItem | ExpenseLineItem | FundingLineItem>) => void
}) {
  const expense = kind === 'costs' ? (item as ExpenseLineItem) : null
  const fund = kind === 'funding' ? (item as FundingLineItem) : null
  const modeGroup = `mode-${item.id}`

  return (
    <div className="line-editor">
      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={item.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </label>

      {expense && (
        <div className="inline-row">
          <label className="inline-field">
            <span>Cash purpose</span>
            <select
              value={expense.cashPurpose}
              onChange={(e) =>
                onUpdate({ cashPurpose: e.target.value as CashPurpose })
              }
            >
              {CASH_PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {CASH_PURPOSE_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-field">
            <span>Detail category</span>
            <select
              value={expense.category}
              onChange={(e) =>
                onUpdate({ category: e.target.value as ExpenseCategory })
              }
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {fund && (
        <label className="inline-field">
          <span>Funding type</span>
          <select
            value={fund.fundingType}
            onChange={(e) =>
              onUpdate({ fundingType: e.target.value as FundingType })
            }
          >
            {(Object.keys(OPENING_FUND_TYPE_LABELS) as FundingType[]).map((t) => (
              <option key={t} value={t}>
                {OPENING_FUND_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="fill-mode">
        <legend className="visually-hidden">Calculation mode</legend>
        {(
          [
            ['uniform', 'Same each month'],
            ['growth', 'Growth %'],
            ['one-time', 'One-time'],
            ...(kind === 'costs'
              ? ([['percent-revenue', '% of revenue']] as const)
              : []),
            ['manual', 'Custom per month'],
          ] as const
        ).map(([mode, label]) => (
          <label key={mode}>
            <input
              type="radio"
              name={modeGroup}
              checked={item.fillMode === mode}
              onChange={() => onUpdate({ fillMode: mode as FillMode })}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {item.fillMode === 'uniform' && (
        <label className="inline-field">
          <span>Monthly amount ({currency})</span>
          <input
            type="number"
            step={50}
            value={item.uniformAmount || ''}
            onChange={(e) => onUpdate({ uniformAmount: Number(e.target.value) || 0 })}
          />
        </label>
      )}

      {item.fillMode === 'growth' && (
        <div className="inline-row">
          <label className="inline-field">
            <span>Month 1 amount</span>
            <input
              type="number"
              step={50}
              value={item.uniformAmount || ''}
              onChange={(e) => onUpdate({ uniformAmount: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="inline-field">
            <span>MoM growth %</span>
            <input
              type="number"
              step={1}
              value={item.growthPercent || ''}
              onChange={(e) => onUpdate({ growthPercent: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
      )}

      {item.fillMode === 'one-time' && (
        <div className="inline-row">
          <label className="inline-field">
            <span>Amount</span>
            <input
              type="number"
              step={50}
              value={item.uniformAmount || ''}
              onChange={(e) => onUpdate({ uniformAmount: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="inline-field">
            <span>Forecast month</span>
            <select
              value={item.oneTimeMonth}
              onChange={(e) => onUpdate({ oneTimeMonth: Number(e.target.value) })}
            >
              {monthLabels.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {item.fillMode === 'percent-revenue' && (
        <div className="inline-row">
          <label className="inline-field">
            <span>Percent of revenue</span>
            <input
              type="number"
              step={0.1}
              value={item.percentOfRevenue || ''}
              onChange={(e) =>
                onUpdate({ percentOfRevenue: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="inline-field">
            <span>Revenue basis</span>
            <select
              value={item.revenueBasisId ?? ''}
              onChange={(e) =>
                onUpdate({
                  revenueBasisId: e.target.value === '' ? null : e.target.value,
                })
              }
            >
              <option value="">Total revenue</option>
              {revenue.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || 'Untitled revenue'}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {item.fillMode === 'manual' && (
        <div className="month-grid month-grid--wide">
          {monthLabels.map((label, i) => (
            <label key={`${item.id}-${label}`} className="month-cell">
              <span title={label}>{label}</span>
              <input
                type="number"
                step={50}
                aria-label={`Amount for ${label}`}
                value={item.amounts[i] || ''}
                onChange={(e) => {
                  const amounts = Array.from({ length: 12 }, (_, idx) =>
                    idx === i ? Number(e.target.value) || 0 : item.amounts[idx] ?? 0,
                  )
                  onUpdate({ amounts })
                }}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
