import type { MonthSummary } from '../types'
import { formatCurrency } from '../utils/calculations'

interface DashboardProps {
  businessName: string
  summaries: MonthSummary[]
  startingCash: number
}

export function Dashboard({ businessName, summaries, startingCash }: DashboardProps) {
  const totalRevenue = summaries.reduce((s, m) => s + m.revenue, 0)
  const totalExpenses = summaries.reduce((s, m) => s + m.expenses, 0)
  const yearNet = totalRevenue - totalExpenses
  const endingCash = summaries[summaries.length - 1]?.cumulative ?? startingCash

  const breakEvenMonth = summaries.find((m) => m.net >= 0)
  const worstCash = Math.min(startingCash, ...summaries.map((m) => m.cumulative))
  const burnMonths = summaries.filter((m) => m.net < 0).length

  return (
    <section className="dashboard">
      <h2>{businessName || 'Your startup'} — year one snapshot</h2>
      <div className="stat-grid">
        <StatCard label="Total revenue" value={formatCurrency(totalRevenue)} variant="positive" />
        <StatCard label="Total expenses" value={formatCurrency(totalExpenses)} variant="negative" />
        <StatCard
          label="Net profit / loss"
          value={formatCurrency(yearNet)}
          variant={yearNet >= 0 ? 'positive' : 'negative'}
        />
        <StatCard label="Cash at year end" value={formatCurrency(endingCash)} variant="neutral" />
        <StatCard
          label="Lowest cash balance"
          value={formatCurrency(worstCash)}
          variant={worstCash < 0 ? 'negative' : 'neutral'}
        />
        <StatCard
          label="Months operating at a loss"
          value={String(burnMonths)}
          variant={burnMonths > 6 ? 'negative' : 'neutral'}
        />
        <StatCard
          label="First profitable month"
          value={breakEvenMonth ? breakEvenMonth.label : 'Not in year 1'}
          variant={breakEvenMonth ? 'positive' : 'negative'}
          small
        />
        <StatCard
          label="Avg monthly burn"
          value={formatCurrency(
            burnMonths > 0
              ? Math.abs(
                  summaries.filter((m) => m.net < 0).reduce((s, m) => s + m.net, 0) / burnMonths,
                )
              : 0,
          )}
          variant="neutral"
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
}: {
  label: string
  value: string
  variant: 'positive' | 'negative' | 'neutral'
  small?: boolean
}) {
  return (
    <article className={`stat-card stat-card--${variant}`}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value${small ? ' stat-value--sm' : ''}`}>{value}</span>
    </article>
  )
}
