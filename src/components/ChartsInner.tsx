import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CurrencyCode, MonthSummary } from '../types'

interface ChartsInnerProps {
  summaries: MonthSummary[]
  currency: CurrencyCode
  view: 'operating' | 'cash'
  cashBuffer: number
  openingCash: number
}

function formatAxis(value: number, currency: CurrencyCode) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return String(value)
  }
}

export function ChartsInner({
  summaries,
  currency,
  view,
  cashBuffer,
  openingCash,
}: ChartsInnerProps) {
  const formatTooltip = (value: unknown) => {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return ''
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  }

  const data = summaries.map((m, i) => ({
    name: m.label.split(' ')[0],
    revenue: m.revenue,
    direct: m.directCosts,
    operating: m.operatingCosts,
    opProfit: m.operatingProfit,
    startup: m.startupSpending,
    loan: m.loanPayments,
    funding: m.additionalFunding,
    netCash: m.netCashChange,
    cash: m.endingCash,
    opening: i === 0 ? openingCash : undefined,
  }))

  const tipStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
  }

  if (view === 'operating') {
    return (
      <div className="chart-grid">
        <div className="chart-card chart-card--wide">
          <h3>Revenue, direct costs, ongoing costs</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => formatAxis(v, currency)}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <Tooltip formatter={formatTooltip} contentStyle={tipStyle} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="var(--accent-green)" />
              <Bar dataKey="direct" name="Direct costs" fill="var(--accent-amber)" />
              <Bar dataKey="operating" name="Ongoing costs" fill="var(--accent-red)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card chart-card--wide">
          <h3>Operating profit / loss</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => formatAxis(v, currency)}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <Tooltip formatter={formatTooltip} contentStyle={tipStyle} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Line
                type="monotone"
                dataKey="opProfit"
                name="Operating profit"
                stroke="var(--accent-blue)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-grid">
      <div className="chart-card chart-card--wide">
        <h3>Ending cash vs buffer</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => formatAxis(v, currency)}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <Tooltip formatter={formatTooltip} contentStyle={tipStyle} />
            {cashBuffer > 0 && (
              <ReferenceLine
                y={cashBuffer}
                stroke="var(--accent-amber)"
                strokeDasharray="4 4"
                label={{ value: 'Buffer', fill: 'var(--text-muted)', fontSize: 11 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="cash"
              name="Ending cash"
              stroke="var(--accent-blue)"
              fill="var(--accent-blue-dim)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card chart-card--wide">
        <h3>Startup, loan payments, funding, net cash change</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => formatAxis(v, currency)}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <Tooltip formatter={formatTooltip} contentStyle={tipStyle} />
            <Legend />
            <Bar dataKey="startup" name="Startup spending" fill="var(--accent-amber)" />
            <Bar dataKey="loan" name="Loan payments" fill="var(--accent-red)" />
            <Bar dataKey="funding" name="Additional funding" fill="var(--accent-green)" />
            <Bar dataKey="netCash" name="Net cash change" fill="var(--accent-blue)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
