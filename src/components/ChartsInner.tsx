import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthSummary } from '../types'

interface ChartsInnerProps {
  summaries: MonthSummary[]
}

function formatAxis(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value}`
}

function formatTooltip(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return ''
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
}

export function ChartsInner({ summaries }: ChartsInnerProps) {
  const data = summaries.map((m) => ({
    name: m.label.split(' ')[0],
    revenue: m.revenue,
    expenses: m.expenses,
    net: m.net,
    cash: m.cumulative,
    gross: m.grossProfit,
  }))

  return (
    <div className="chart-grid">
      <div className="chart-card">
        <h3>Revenue vs total expenses</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <YAxis tickFormatter={formatAxis} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <Tooltip
              formatter={formatTooltip}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="var(--accent-green)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="var(--accent-red)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Cash balance over time</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <YAxis tickFormatter={formatAxis} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <Tooltip
              formatter={formatTooltip}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="cash"
              name="Cash"
              stroke="var(--accent-blue)"
              fill="var(--accent-blue-dim)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card chart-card--wide">
        <h3>Monthly net profit / loss</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <YAxis tickFormatter={formatAxis} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <Tooltip
              formatter={formatTooltip}
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="var(--accent-amber)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
