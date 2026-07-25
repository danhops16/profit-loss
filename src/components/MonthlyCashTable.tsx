import type { CurrencyCode, MonthSummary } from '../types'
import { formatMoneyDetailed } from '../utils/formatMoney'

interface MonthlyCashTableProps {
  summaries: MonthSummary[]
  currency: CurrencyCode
}

export function MonthlyCashTable({ summaries, currency }: MonthlyCashTableProps) {
  const sum = (key: keyof MonthSummary) =>
    summaries.reduce((s, m) => {
      const v = m[key]
      return typeof v === 'number' ? s + v : s
    }, 0)

  return (
    <section className="section">
      <h2>Monthly cash plan</h2>
      <p className="cash-timing-note">
        Operating profit excludes startup spending and loan payments. Those still reduce ending
        cash.
      </p>
      <div className="table-wrap">
        <table className="pl-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">Revenue</th>
              <th className="num">Direct</th>
              <th className="num">Ongoing</th>
              <th className="num">Op. profit</th>
              <th className="num">Startup</th>
              <th className="num">Loan pay</th>
              <th className="num">Funding in</th>
              <th className="num">Net cash</th>
              <th className="num">Ending cash</th>
              <th className="num">Buffer gap</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="num">{formatMoneyDetailed(row.revenue, currency)}</td>
                <td className="num">{formatMoneyDetailed(row.directCosts, currency)}</td>
                <td className="num">{formatMoneyDetailed(row.operatingCosts, currency)}</td>
                <td className={`num ${row.operatingProfit >= 0 ? 'positive' : 'negative'}`}>
                  {formatMoneyDetailed(row.operatingProfit, currency)}
                </td>
                <td className="num">{formatMoneyDetailed(row.startupSpending, currency)}</td>
                <td className="num">{formatMoneyDetailed(row.loanPayments, currency)}</td>
                <td className="num">{formatMoneyDetailed(row.additionalFunding, currency)}</td>
                <td className={`num ${row.netCashChange >= 0 ? 'positive' : 'negative'}`}>
                  {formatMoneyDetailed(row.netCashChange, currency)}
                </td>
                <td className={`num ${row.endingCash >= 0 ? '' : 'negative'}`}>
                  {formatMoneyDetailed(row.endingCash, currency)}
                </td>
                <td className="num">{formatMoneyDetailed(row.bufferGap, currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Year total</td>
              <td className="num">{formatMoneyDetailed(sum('revenue'), currency)}</td>
              <td className="num">{formatMoneyDetailed(sum('directCosts'), currency)}</td>
              <td className="num">{formatMoneyDetailed(sum('operatingCosts'), currency)}</td>
              <td className="num">{formatMoneyDetailed(sum('operatingProfit'), currency)}</td>
              <td className="num">{formatMoneyDetailed(sum('startupSpending'), currency)}</td>
              <td className="num">{formatMoneyDetailed(sum('loanPayments'), currency)}</td>
              <td className="num">{formatMoneyDetailed(sum('additionalFunding'), currency)}</td>
              <td className="num">{formatMoneyDetailed(sum('netCashChange'), currency)}</td>
              <td className="num">
                {formatMoneyDetailed(
                  summaries[summaries.length - 1]?.endingCash ?? 0,
                  currency,
                )}
              </td>
              <td className="num">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
