import type { CurrencyCode, MonthSummary } from '../types'
import type { PlannerMetrics } from '../utils/calculations'
import { formatMargin, formatMoney } from '../utils/formatMoney'

interface DashboardProps {
  businessName: string
  currency: CurrencyCode
  summaries: MonthSummary[]
  metrics: PlannerMetrics
}

export function Dashboard({ businessName, currency, metrics }: DashboardProps) {
  return (
    <section className="dashboard" aria-label="Year one snapshot">
      <h2>{businessName || 'Your startup'} — year one snapshot</h2>
      <p className="cash-timing-note">
        Cash assumes revenue and expenses are paid in the same month they appear in
        the forecast.
      </p>
      <div className="stat-grid">
        <StatCard label="Total revenue" value={formatMoney(metrics.totalRevenue, currency)} variant="positive" />
        <StatCard label="COGS" value={formatMoney(metrics.totalCogs, currency)} variant="negative" />
        <StatCard
          label="Gross profit"
          value={formatMoney(metrics.grossProfit, currency)}
          variant={metrics.grossProfit >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Gross margin"
          value={formatMargin(metrics.grossMargin)}
          variant="neutral"
          small
        />
        <StatCard
          label="Operating expenses"
          value={formatMoney(metrics.operatingExpenses, currency)}
          variant="negative"
        />
        <StatCard
          label="Net profit / loss"
          value={formatMoney(metrics.yearNet, currency)}
          variant={metrics.yearNet >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Net margin"
          value={formatMargin(metrics.netMargin)}
          variant="neutral"
          small
        />
        <StatCard
          label="Cash at year end"
          value={formatMoney(metrics.endingCash, currency)}
          variant="neutral"
        />
        <StatCard
          label="Lowest cash balance"
          value={
            metrics.lowestCashMonthLabel
              ? `${formatMoney(metrics.lowestCash, currency)} (${metrics.lowestCashMonthLabel})`
              : formatMoney(metrics.lowestCash, currency)
          }
          variant={metrics.lowestCash < 0 ? 'negative' : 'neutral'}
          small
        />
        <StatCard
          label="Cash runway"
          value={metrics.runwayLabel}
          variant={
            metrics.runwayLabel === '12+ months'
              ? 'positive'
              : metrics.runwayMonths === 0
                ? 'negative'
                : 'neutral'
          }
          small
          hint="Complete months with non-negative ending cash before the first negative month"
        />
        <StatCard
          label="First profitable month"
          value={metrics.firstProfitableMonthLabel ?? 'Not in year 1'}
          variant={metrics.firstProfitableMonthLabel ? 'positive' : 'negative'}
          small
          hint="First month where net profit is greater than zero"
        />
        <StatCard
          label="First negative cash month"
          value={metrics.firstNegativeCashMonthLabel ?? 'None in year 1'}
          variant={metrics.firstNegativeCashMonthLabel ? 'negative' : 'positive'}
          small
        />
        <StatCard
          label="Average monthly loss"
          value={formatMoney(metrics.averageMonthlyLoss, currency)}
          variant="neutral"
          hint="Average absolute net in months that lost money (not cash burn)"
        />
        <StatCard
          label="Months operating at a loss"
          value={String(metrics.monthsAtLoss)}
          variant={metrics.monthsAtLoss > 6 ? 'negative' : 'neutral'}
        />
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  variant,
  small,
  hint,
}: {
  label: string
  value: string
  variant: 'positive' | 'negative' | 'neutral'
  small?: boolean
  hint?: string
}) {
  return (
    <article className={`stat-card stat-card--${variant}`} title={hint}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value${small ? ' stat-value--sm' : ''}`}>{value}</span>
    </article>
  )
}
