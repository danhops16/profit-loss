import type { ExpenseCategory, ExpenseLineItem, LineItem } from '../types'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '../types'
import { resolveAmounts } from '../utils/calculations'
import { formatMoney } from '../utils/formatMoney'
import type { CurrencyCode } from '../types'

interface LineItemSectionProps {
  title: string
  kind: 'revenue' | 'expenses'
  items: LineItem[] | ExpenseLineItem[]
  accent: 'green' | 'red'
  monthLabels: string[]
  currency: CurrencyCode
  presets?: Array<{ name: string; category?: ExpenseCategory }>
  onAdd: (name?: string, category?: ExpenseCategory) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<LineItem | ExpenseLineItem>) => void
}

export function LineItemSection({
  title,
  kind,
  items,
  accent,
  monthLabels,
  currency,
  presets = [],
  onAdd,
  onRemove,
  onUpdate,
}: LineItemSectionProps) {
  const sectionId = `${kind}-heading`

  return (
    <section className={`section section--${accent}`} aria-labelledby={sectionId}>
      <div className="section-head">
        <h2 id={sectionId}>{title}</h2>
        <div className="section-actions">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onAdd(preset.name, preset.category)}
            >
              + {preset.name}
            </button>
          ))}
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => onAdd()}
          >
            Add line
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="empty-hint">No {kind} yet. Add a line to get started.</p>
      ) : (
        <div className="line-items">
          {items.map((item) => (
            <LineItemCard
              key={item.id}
              item={item}
              kind={kind}
              monthLabels={monthLabels}
              currency={currency}
              canRemove={items.length > 1}
              onRemove={() => onRemove(item.id)}
              onUpdate={(patch) => onUpdate(item.id, patch)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function LineItemCard({
  item,
  kind,
  monthLabels,
  currency,
  canRemove,
  onRemove,
  onUpdate,
}: {
  item: LineItem | ExpenseLineItem
  kind: 'revenue' | 'expenses'
  monthLabels: string[]
  currency: CurrencyCode
  canRemove: boolean
  onRemove: () => void
  onUpdate: (patch: Partial<LineItem | ExpenseLineItem>) => void
}) {
  const resolved = resolveAmounts(item)
  const yearlyTotal = resolved.reduce((a, b) => a + b, 0)
  const nameId = `line-name-${item.id}`
  const modeGroup = `mode-${item.id}`
  const expense = kind === 'expenses' ? (item as ExpenseLineItem) : null

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
        <span className="line-yearly">{formatMoney(yearlyTotal, currency)}/yr</span>
        {canRemove && (
          <button
            type="button"
            className="btn-icon"
            onClick={onRemove}
            aria-label={`Remove ${item.name || 'line item'}`}
            title="Remove"
          >
            ×
          </button>
        )}
      </div>

      {expense && (
        <label className="inline-field category-field">
          <span>Category</span>
          <select
            value={expense.category}
            onChange={(e) =>
              onUpdate({ category: e.target.value as ExpenseCategory })
            }
            aria-label={`Category for ${item.name || 'expense'}`}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {EXPENSE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="fill-mode">
        <legend className="visually-hidden">How to fill monthly amounts</legend>
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
          <span>Monthly amount</span>
          <input
            type="number"
            min={0}
            step={50}
            value={item.uniformAmount || ''}
            onChange={(e) =>
              onUpdate({ uniformAmount: Number(e.target.value) || 0 })
            }
          />
        </label>
      )}

      {item.fillMode === 'growth' && (
        <div className="inline-row">
          <label className="inline-field">
            <span>Month 1</span>
            <input
              type="number"
              min={0}
              step={50}
              value={item.uniformAmount || ''}
              onChange={(e) =>
                onUpdate({ uniformAmount: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="inline-field">
            <span>MoM growth %</span>
            <input
              type="number"
              step={1}
              value={item.growthPercent || ''}
              onChange={(e) =>
                onUpdate({ growthPercent: Number(e.target.value) || 0 })
              }
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
              min={0}
              step={50}
              value={item.uniformAmount || ''}
              onChange={(e) =>
                onUpdate({ uniformAmount: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="inline-field">
            <span>Forecast month</span>
            <select
              value={item.oneTimeMonth}
              onChange={(e) =>
                onUpdate({ oneTimeMonth: Number(e.target.value) })
              }
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

      {item.fillMode === 'manual' && (
        <div className="month-grid">
          {monthLabels.map((label, i) => (
            <label key={`${item.id}-${label}`} className="month-cell">
              <span title={label}>{label}</span>
              <input
                type="number"
                min={0}
                step={50}
                aria-label={`Amount for ${label}`}
                value={item.amounts[i] || ''}
                onChange={(e) => {
                  const amounts = Array.from({ length: 12 }, (_, idx) =>
                    idx === i
                      ? Number(e.target.value) || 0
                      : item.amounts[idx] ?? 0,
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
