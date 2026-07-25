import { useState } from 'react'
import type {
  CashPurpose,
  CurrencyCode,
  ExpenseCategory,
  ExpenseLineItem,
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

const COST_GROUPS: CashPurpose[] = [
  'direct',
  'operating',
  'startup',
  'loan_payment',
  'other_outflow',
]

export function LineWorkspace({
  currency,
  monthLabels,
  revenue,
  expenses,
  funding,
  onAdd,
  onUpdate,
  onDuplicate,
  onRemove,
}: LineWorkspaceProps) {
  const [tab, setTab] = useState<EditorTab>('costs')
  const context = buildRevenueContext(revenue)
  const money = (n: number) => formatMoney(n, currency)

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
                onClick={() => onAdd('revenue', name)}
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
                  onAdd('costs', p.name, {
                    cashPurpose: p.cashPurpose,
                    category: p.category,
                  })
                }
              >
                + {p.name}
              </button>
            ))}
          {tab === 'funding' && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onAdd('funding', 'Owner top-up', { fundingType: 'owner' })}
            >
              + Owner top-up
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => onAdd(tab)}
          >
            Add line
          </button>
        </div>
      </div>

      {tab === 'funding' && (
        <p className="cash-timing-note">
          Planned funding increases cash in the selected month. It does not count as revenue or
          operating profit.
        </p>
      )}

      {tab === 'revenue' && (
        <LineCardList
          kind="revenue"
          items={revenue}
          currency={currency}
          monthLabels={monthLabels}
          revenue={revenue}
          context={context}
          money={money}
          canRemove={revenue.length > 1}
          onUpdate={onUpdate}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      )}

      {tab === 'funding' && (
        <LineCardList
          kind="funding"
          items={funding}
          currency={currency}
          monthLabels={monthLabels}
          revenue={revenue}
          context={context}
          money={money}
          canRemove={funding.length > 0}
          onUpdate={onUpdate}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      )}

      {tab === 'costs' && (
        <div className="cost-groups">
          {COST_GROUPS.map((purpose) => {
            const group = expenses.filter((e) => e.cashPurpose === purpose)
            if (group.length === 0) return null
            return (
              <div key={purpose} className="cost-group">
                <h3 className="cost-group__title">{CASH_PURPOSE_LABELS[purpose]}</h3>
                <LineCardList
                  kind="costs"
                  items={group}
                  currency={currency}
                  monthLabels={monthLabels}
                  revenue={revenue}
                  context={context}
                  money={money}
                  canRemove={expenses.length > 1}
                  onUpdate={onUpdate}
                  onDuplicate={onDuplicate}
                  onRemove={onRemove}
                />
              </div>
            )
          })}
          {expenses.length === 0 && (
            <p className="empty-hint">No costs yet. Add a line to get started.</p>
          )}
        </div>
      )}
    </section>
  )
}

function LineCardList({
  kind,
  items,
  currency,
  monthLabels,
  revenue,
  context,
  money,
  canRemove,
  onUpdate,
  onDuplicate,
  onRemove,
}: {
  kind: EditorTab
  items: Array<LineItem | ExpenseLineItem | FundingLineItem>
  currency: CurrencyCode
  monthLabels: string[]
  revenue: LineItem[]
  context: ReturnType<typeof buildRevenueContext>
  money: (n: number) => string
  canRemove: boolean
  onUpdate: LineWorkspaceProps['onUpdate']
  onDuplicate: LineWorkspaceProps['onDuplicate']
  onRemove: LineWorkspaceProps['onRemove']
}) {
  if (items.length === 0 && kind !== 'costs') {
    return <p className="empty-hint">No lines yet. Add a line to get started.</p>
  }

  return (
    <div className="line-cards">
      {items.map((item) => {
        const total = roundCents(
          resolveAmounts(item, context).reduce((a, b) => a + b, 0),
        )
        return (
          <LineCard
            key={item.id}
            kind={kind}
            item={item}
            currency={currency}
            monthLabels={monthLabels}
            revenue={revenue}
            totalLabel={`${money(total)} · 12-mo total`}
            canRemove={canRemove}
            onUpdate={(patch) => onUpdate(kind, item.id, patch)}
            onDuplicate={() => onDuplicate(kind, item.id)}
            onRemove={() => onRemove(kind, item.id)}
          />
        )
      })}
    </div>
  )
}

function LineCard({
  kind,
  item,
  currency,
  monthLabels,
  revenue,
  totalLabel,
  canRemove,
  onUpdate,
  onDuplicate,
  onRemove,
}: {
  kind: EditorTab
  item: LineItem | ExpenseLineItem | FundingLineItem
  currency: CurrencyCode
  monthLabels: string[]
  revenue: LineItem[]
  totalLabel: string
  canRemove: boolean
  onUpdate: (patch: Partial<LineItem | ExpenseLineItem | FundingLineItem>) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const expense = kind === 'costs' ? (item as ExpenseLineItem) : null
  const fund = kind === 'funding' ? (item as FundingLineItem) : null
  const modeGroup = `mode-${item.id}`
  const nameId = `name-${item.id}`

  return (
    <article className="line-card" aria-label={`${kind} line: ${item.name || 'Untitled'}`}>
      <div className="line-card__head">
        <label className="visually-hidden" htmlFor={nameId}>
          Line item name
        </label>
        <input
          id={nameId}
          type="text"
          className="line-name"
          value={item.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Line item name"
        />
        <span className="line-yearly">{totalLabel}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDuplicate}>
          Duplicate
        </button>
        {canRemove && (
          <button
            type="button"
            className="btn btn--ghost btn--sm btn--danger"
            onClick={onRemove}
            aria-label={`Remove ${item.name || 'line item'}`}
          >
            Remove
          </button>
        )}
      </div>

      {expense && (
        <div className="inline-row">
          <label className="inline-field">
            <span>Cash purpose</span>
            <select
              value={expense.cashPurpose}
              onChange={(e) => onUpdate({ cashPurpose: e.target.value as CashPurpose })}
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
              onChange={(e) => onUpdate({ category: e.target.value as ExpenseCategory })}
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
            onChange={(e) => onUpdate({ fundingType: e.target.value as FundingType })}
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
        <label>
          <input
            type="radio"
            name={modeGroup}
            checked={item.fillMode === 'uniform'}
            onChange={() => onUpdate({ fillMode: 'uniform' })}
          />
          Same each month
        </label>
        <label>
          <input
            type="radio"
            name={modeGroup}
            checked={item.fillMode === 'growth'}
            onChange={() => onUpdate({ fillMode: 'growth' })}
          />
          Growth %
        </label>
        <label>
          <input
            type="radio"
            name={modeGroup}
            checked={item.fillMode === 'one-time'}
            onChange={() => onUpdate({ fillMode: 'one-time' })}
          />
          One-time
        </label>
        {kind === 'costs' && (
          <label>
            <input
              type="radio"
              name={modeGroup}
              checked={item.fillMode === 'percent-revenue'}
              onChange={() => onUpdate({ fillMode: 'percent-revenue' })}
            />
            % of revenue
          </label>
        )}
        <label>
          <input
            type="radio"
            name={modeGroup}
            checked={item.fillMode === 'manual'}
            onChange={() => onUpdate({ fillMode: 'manual' })}
          />
          Custom per month
        </label>
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
              onChange={(e) => onUpdate({ percentOfRevenue: Number(e.target.value) || 0 })}
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
    </article>
  )
}
