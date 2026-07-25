import { useState } from 'react'
import type { CurrencyCode } from '../types'
import type { PlannerMetrics } from '../utils/calculations'
import { formatMoney } from '../utils/formatMoney'

interface DashboardProps {
  businessName: string
  currency: CurrencyCode
  metrics: PlannerMetrics
}

export function Dashboard({ businessName, currency, metrics }: DashboardProps) {
  const [showMore, setShowMore] = useState(false)
  const fundingOk = metrics.personalFundingRequired === 0

  return (
    <section className="dashboard" aria-label="Cash and operations snapshot">
      <h2>{businessName || 'Your startup'} — cash-first snapshot</h2>
      <p className="cash-timing-note">
        Cash assumes money in and out hits the account in the same forecast month it is
        entered. This is a planning estimate, not bookkeeping.
      </p>

      <h3 className="dash-group-title">Cash and funding</h3>
      <div className="stat-grid stat-grid--priority">
        <StatCard
          label="Total opening funds"
          value={formatMoney(metrics.totalOpeningFunds, currency)}
        />
        <StatCard
          label="Cash after month one"
          value={formatMoney(metrics.cashAfterMonthOne, currency)}
          variant={metrics.cashAfterMonthOne < 0 ? 'negative' : 'neutral'}
        />
        <StatCard
          label="Lowest cash"
          value={
            metrics.lowestCashMonthLabel
              ? `${formatMoney(metrics.lowestCash, currency)} (${metrics.lowestCashMonthLabel})`
              : formatMoney(metrics.lowestCash, currency)
          }
          variant={metrics.lowestCash < 0 ? 'negative' : 'neutral'}
          small
        />
        <StatCard
          label="Ending cash"
          value={formatMoney(metrics.endingCash, currency)}
        />
        <StatCard
          label="Personal funding required"
          value={
            fundingOk
              ? 'No additional personal funding required in this forecast'
              : formatMoney(metrics.personalFundingRequired, currency)
          }
          variant={fundingOk ? 'positive' : 'negative'}
          small
          hint={
            fundingOk
              ? undefined
              : metrics.personalFundingFirstMonthLabel
                ? `First needed: ${metrics.personalFundingFirstMonthLabel}`
                : undefined
          }
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
        />
      </div>

      <button
        type="button"
        className="btn btn--ghost btn--sm details-toggle"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
      >
        {showMore ? 'Hide secondary details' : 'Show secondary cash details'}
      </button>

      {showMore && (
        <div className="stat-grid">
          <StatCard
            label="Months below buffer"
            value={String(metrics.monthsBelowBuffer)}
          />
          <StatCard
            label="First negative-cash month"
            value={metrics.firstNegativeCashMonthLabel ?? 'None in year 1'}
            variant={metrics.firstNegativeCashMonthLabel ? 'negative' : 'positive'}
            small
          />
          <StatCard
            label="Startup spending (year)"
            value={formatMoney(metrics.totalStartupSpending, currency)}
          />
          <StatCard
            label="Loan payments (year)"
            value={formatMoney(metrics.totalLoanPayments, currency)}
          />
          <StatCard
            label="Planned additional funding"
            value={formatMoney(metrics.totalAdditionalFunding, currency)}
          />
        </div>
      )}

      <h3 className="dash-group-title">Business operations</h3>
      <div className="stat-grid">
        <StatCard
          label="Annual revenue"
          value={formatMoney(metrics.totalRevenue, currency)}
          variant="positive"
        />
        <StatCard
          label="Direct costs"
          value={formatMoney(metrics.totalDirectCosts, currency)}
          variant="negative"
        />
        <StatCard
          label="Ongoing operating costs"
          value={formatMoney(metrics.totalOperatingCosts, currency)}
          variant="negative"
        />
        <StatCard
          label="Operating profit / loss"
          value={formatMoney(metrics.operatingProfit, currency)}
          variant={metrics.operatingProfit >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="First profitable operating month"
          value={metrics.firstProfitableOperatingMonthLabel ?? 'Not in year 1'}
          variant={metrics.firstProfitableOperatingMonthLabel ? 'positive' : 'negative'}
          small
        />
        <StatCard
          label="Average monthly operating loss"
          value={formatMoney(metrics.averageMonthlyOperatingLoss, currency)}
          hint="Average absolute operating loss in months that lost money (not cash burn)"
        />
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  variant = 'neutral',
  small,
  hint,
}: {
  label: string
  value: string
  variant?: 'positive' | 'negative' | 'neutral'
  small?: boolean
  hint?: string
}) {
  return (
    <article className={`stat-card stat-card--${variant}`} title={hint}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value${small ? ' stat-value--sm' : ''}`}>{value}</span>
      {hint ? <span className="stat-hint">{hint}</span> : null}
    </article>
  )
}
