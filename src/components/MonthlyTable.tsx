import type { MonthSummary } from '../types'
import { formatCurrencyDetailed } from '../utils/calculations'

interface MonthlyTableProps {
  summaries: MonthSummary[]
}

export function MonthlyTable({ summaries }: MonthlyTableProps) {
  return (
    <section className="section">
      <h2>Monthly P&amp;L</h2>
      <div className="table-wrap">
        <table className="pl-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">Revenue</th>
              <th className="num">Expenses</th>
              <th className="num">Net</th>
              <th className="num">Cash balance</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="num positive">{formatCurrencyDetailed(row.revenue)}</td>
                <td className="num negative">{formatCurrencyDetailed(row.expenses)}</td>
                <td className={`num ${row.net >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrencyDetailed(row.net)}
                </td>
                <td className={`num ${row.cumulative >= 0 ? '' : 'negative'}`}>
                  {formatCurrencyDetailed(row.cumulative)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Year total</td>
              <td className="num positive">
                {formatCurrencyDetailed(summaries.reduce((s, m) => s + m.revenue, 0))}
              </td>
              <td className="num negative">
                {formatCurrencyDetailed(summaries.reduce((s, m) => s + m.expenses, 0))}
              </td>
              <td
                className={`num ${
                  summaries.reduce((s, m) => s + m.net, 0) >= 0 ? 'positive' : 'negative'
                }`}
              >
                {formatCurrencyDetailed(summaries.reduce((s, m) => s + m.net, 0))}
              </td>
              <td className="num">
                {formatCurrencyDetailed(summaries[summaries.length - 1]?.cumulative ?? 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
