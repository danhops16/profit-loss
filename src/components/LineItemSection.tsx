import type { LineItem } from '../types'
import { formatCurrency, resolveAmounts } from '../utils/calculations'

interface LineItemSectionProps {
  title: string
  kind: 'revenue' | 'expenses'
  items: LineItem[]
  accent: 'green' | 'red'
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
  presets = [],
  onAdd,
  onRemove,
  onUpdate,
}: LineItemSectionProps) {
  return (
    <section className={`section section--${accent}`}>
      <div className="section-head">
        <h2>{title}</h2>
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
  canRemove,
  onRemove,
  onUpdate,
}: {
  item: LineItem
  canRemove: boolean
  onRemove: () => void
  onUpdate: (patch: Partial<LineItem>) => void
}) {
  const resolved = resolveAmounts(item)
  const yearlyTotal = resolved.reduce((a, b) => a + b, 0)

  return (
    <article className="line-card">
      <div className="line-card__head">
        <input
          type="text"
          className="line-name"
          value={item.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Line item name"
        />
        <span className="line-yearly">{formatCurrency(yearlyTotal)}/yr</span>
        {canRemove && (
          <button type="button" className="btn-icon" onClick={onRemove} title="Remove">
            ×
          </button>
        )}
      </div>

      <div className="fill-mode">
        <label>
          <input
            type="radio"
            name={`mode-${item.id}`}
            checked={item.fillMode === 'uniform'}
            onChange={() => onUpdate({ fillMode: 'uniform' })}
          />
          Same each month
        </label>
        <label>
          <input
            type="radio"
            name={`mode-${item.id}`}
            checked={item.fillMode === 'growth'}
            onChange={() => onUpdate({ fillMode: 'growth' })}
          />
          Growth %
        </label>
        <label>
          <input
            type="radio"
            name={`mode-${item.id}`}
            checked={item.fillMode === 'manual'}
            onChange={() => onUpdate({ fillMode: 'manual' })}
          />
          Custom per month
        </label>
      </div>

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
          {resolved.map((_, i) => (
            <label key={i} className="month-cell">
              <span>M{i + 1}</span>
              <input
                type="number"
                min={0}
                step={50}
                value={item.amounts[i] || ''}
                onChange={(e) => {
                  const amounts = [...item.amounts]
                  while (amounts.length < 12) amounts.push(0)
                  amounts[i] = Number(e.target.value) || 0
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
