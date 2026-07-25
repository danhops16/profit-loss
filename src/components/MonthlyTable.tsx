import type { CurrencyCode, MonthSummary } from '../types'
import { formatMargin, formatMoneyDetailed } from '../utils/formatMoney'

interface MonthlyTableProps {
  summaries: MonthSummary[]
  currency: CurrencyCode
}

export function MonthlyTable({ summaries, currency }: MonthlyTableProps) {
  const sum = (key: keyof MonthSummary) =>
    summaries.reduce((s, m) => {
      const v = m[key]
      return typeof v === 'number' ? s + v : s
    }, 0)

  const yearRevenue = sum('revenue')
  const yearCogs = sum('cogs')
  const yearGross = sum('grossProfit')
  const yearOpex = sum('operatingExpenses')
  const yearNet = sum('net')

  return (
    <section className="section">
      <h2>Monthly P&amp;L</h2>
      <p className="cash-timing-note">
        Cash assumes revenue and expenses are paid in the same month they appear in
        the forecast.
      </p>
      <div className="table-wrap">
        <table className="pl-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">Revenue</th>
              <th className="num">COGS</th>
              <th className="num">Gross profit</th>
              <th className="num">Gross margin</th>
              <th className="num">OpEx</th>
              <th className="num">Net profit</th>
              <th className="num">Ending cash</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="num positive">{formatMoneyDetailed(row.revenue, currency)}</td>
                <td className="num negative">{formatMoneyDetailed(row.cogs, currency)}</td>
                <td className={`num ${row.grossProfit >= 0 ? 'positive' : 'negative'}`}>
                  {formatMoneyDetailed(row.grossProfit, currency)}
                </td>
                <td className="num">{formatMargin(row.grossMargin)}</td>
                <td className="num negative">
                  {formatMoneyDetailed(row.operatingExpenses, currency)}
                </td>
                <td className={`num ${row.net >= 0 ? 'positive' : 'negative'}`}>
                  {formatMoneyDetailed(row.net, currency)}
                </td>
                <td className={`num ${row.cumulative >= 0 ? '' : 'negative'}`}>
                  {formatMoneyDetailed(row.cumulative, currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Year total</td>
              <td className="num positive">{formatMoneyDetailed(yearRevenue, currency)}</td>
              <td className="num negative">{formatMoneyDetailed(yearCogs, currency)}</td>
              <td className={`num ${yearGross >= 0 ? 'positive' : 'negative'}`}>
                {formatMoneyDetailed(yearGross, currency)}
              </td>
              <td className="num">
                {formatMargin(yearRevenue === 0 ? null : yearGross / yearRevenue)}
              </td>
              <td className="num negative">{formatMoneyDetailed(yearOpex, currency)}</td>
              <td className={`num ${yearNet >= 0 ? 'positive' : 'negative'}`}>
                {formatMoneyDetailed(yearNet, currency)}
              </td>
              <td className="num">
                {formatMoneyDetailed(
                  summaries[summaries.length - 1]?.cumulative ?? 0,
                  currency,
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
