import type { MonthSummary } from '../types'
import { buildMetrics, formatCurrency } from '../utils/calculations'

interface DashboardProps {
  businessName: string
  summaries: MonthSummary[]
  startingCash: number
}

export function Dashboard({ businessName, summaries, startingCash }: DashboardProps) {
  const metrics = buildMetrics(summaries, startingCash)

  return (
    <section className="dashboard" aria-label="Year one snapshot">
      <h2>{businessName || 'Your startup'} — year one snapshot</h2>
      <div className="stat-grid">
        <StatCard label="Total revenue" value={formatCurrency(metrics.totalRevenue)} variant="positive" />
        <StatCard label="Total expenses" value={formatCurrency(metrics.totalExpenses)} variant="negative" />
        <StatCard
          label="Net profit / loss"
          value={formatCurrency(metrics.yearNet)}
          variant={metrics.yearNet >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Cash at year end"
          value={formatCurrency(metrics.endingCash)}
          variant="neutral"
        />
        <StatCard
          label="Lowest cash balance"
          value={formatCurrency(metrics.lowestCash)}
          variant={metrics.lowestCash < 0 ? 'negative' : 'neutral'}
        />
        <StatCard
          label="Months operating at a loss"
          value={String(metrics.monthsAtLoss)}
          variant={metrics.monthsAtLoss > 6 ? 'negative' : 'neutral'}
        />
        <StatCard
          label="First profitable month"
          value={metrics.firstProfitableMonthLabel ?? 'Not in year 1'}
          variant={metrics.firstProfitableMonthLabel ? 'positive' : 'negative'}
          small
          hint="First month where net profit is greater than zero"
        />
        <StatCard
          label="Average monthly loss"
          value={formatCurrency(metrics.averageMonthlyLoss)}
          variant="neutral"
          hint="Average absolute net in months that lost money"
        />
        <StatCard
          label="Cash runway"
          value={metrics.runwayLabel}
          variant={
            metrics.runwayLabel === '12+ months'
              ? 'positive'
              : metrics.runwayLabel === 'Already negative'
                ? 'negative'
                : 'neutral'
          }
          small
          hint="First month ending cash is negative, or 12+ months if it stays non-negative"
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
