import type { CurrencyCode } from '../types'
import type { PlannerMetrics } from '../utils/calculations'
import { formatMargin, formatMoney } from '../utils/formatMoney'

interface StickySummaryProps {
  scenarioName: string
  currency: CurrencyCode
  metrics: PlannerMetrics
}

export function StickySummary({ scenarioName, currency, metrics }: StickySummaryProps) {
  return (
    <div className="sticky-summary" role="region" aria-label="Quick forecast summary">
      <div className="sticky-summary__inner">
        <span className="sticky-chip">
          <span className="sticky-chip__label">Scenario</span>
          <strong>{scenarioName}</strong>
        </span>
        <span className="sticky-chip">
          <span className="sticky-chip__label">Revenue</span>
          <strong>{formatMoney(metrics.totalRevenue, currency)}</strong>
        </span>
        <span className="sticky-chip">
          <span className="sticky-chip__label">Net profit</span>
          <strong className={metrics.yearNet >= 0 ? 'positive' : 'negative'}>
            {formatMoney(metrics.yearNet, currency)}
          </strong>
        </span>
        <span className="sticky-chip">
          <span className="sticky-chip__label">Ending cash</span>
          <strong>{formatMoney(metrics.endingCash, currency)}</strong>
        </span>
        <span className="sticky-chip">
          <span className="sticky-chip__label">Runway</span>
          <strong>{metrics.runwayLabel}</strong>
        </span>
        <span className="sticky-chip sticky-chip--muted">
          <span className="sticky-chip__label">Net margin</span>
          <strong>{formatMargin(metrics.netMargin)}</strong>
        </span>
      </div>
    </div>
  )
}
