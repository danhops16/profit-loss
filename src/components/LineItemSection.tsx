import type { LineItem } from '../types'
import { formatCurrency, resolveAmounts } from '../utils/calculations'

interface LineItemSectionProps {
  title: string
  kind: 'revenue' | 'expenses'
  items: LineItem[]
  accent: 'green' | 'red'
  monthLabels: string[]
  presets?: string[]
  onAdd: (name?: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<LineItem>) => void
}

export function LineItemSection({
  title,
  kind,
  items,
  accent,
  monthLabels,
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
          {presets.map((name) => (
            <button
              key={name}
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onAdd(name)}
            >
              + {name}
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
  canRemove,
  onRemove,
  onUpdate,
}: {
  item: LineItem
  kind: 'revenue' | 'expenses'
  monthLabels: string[]
  canRemove: boolean
  onRemove: () => void
  onUpdate: (patch: Partial<LineItem>) => void
}) {
  const resolved = resolveAmounts(item)
  const yearlyTotal = resolved.reduce((a, b) => a + b, 0)
  const nameId = `line-name-${item.id}`
  const modeGroup = `mode-${item.id}`

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
        <span className="line-yearly">{formatCurrency(yearlyTotal)}/yr</span>
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
