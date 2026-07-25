import type { CurrencyCode } from '../types'
import type { PlannerMetrics } from '../utils/calculations'
import { formatMoney } from '../utils/formatMoney'

interface StickySummaryProps {
  scenarioName: string
  currency: CurrencyCode
  metrics: PlannerMetrics
}

export function StickySummary({ scenarioName, currency, metrics }: StickySummaryProps) {
  return (
    <div className="sticky-summary" role="region" aria-label="Quick cash summary">
      <div className="sticky-summary__inner">
        <span className="sticky-chip">
          <span className="sticky-chip__label">Scenario</span>
          <strong>{scenarioName}</strong>
        </span>
        <span className="sticky-chip">
          <span className="sticky-chip__label">Cash after month 1</span>
          <strong>{formatMoney(metrics.cashAfterMonthOne, currency)}</strong>
        </span>
        <span className="sticky-chip">
          <span className="sticky-chip__label">Lowest cash</span>
          <strong className={metrics.lowestCash < 0 ? 'negative' : undefined}>
            {formatMoney(metrics.lowestCash, currency)}
          </strong>
        </span>
        <span className="sticky-chip">
          <span className="sticky-chip__label">Personal funding needed</span>
          <strong>
            {metrics.personalFundingRequired > 0
              ? formatMoney(metrics.personalFundingRequired, currency)
              : 'None'}
          </strong>
        </span>
        <span className="sticky-chip">
          <span className="sticky-chip__label">Ending cash</span>
          <strong>{formatMoney(metrics.endingCash, currency)}</strong>
        </span>
      </div>
    </div>
  )
}
