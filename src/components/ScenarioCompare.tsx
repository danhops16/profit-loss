import type { CurrencyCode, ScenarioComparisonRow } from '../types'
import { formatMoney } from '../utils/formatMoney'

interface ScenarioCompareProps {
  rows: ScenarioComparisonRow[]
  currency: CurrencyCode
  activeScenarioId: string
}

type NumericKey = keyof Pick<
  ScenarioComparisonRow,
  | 'cashAfterMonthOne'
  | 'lowestCash'
  | 'personalFundingRequired'
  | 'endingCash'
  | 'operatingProfit'
>

function highlightTone(
  rows: ScenarioComparisonRow[],
  key: NumericKey,
  value: number,
  higherIsBetter: boolean,
): 'best' | 'worst' | undefined {
  const values = rows.map((r) => r[key]).filter((v) => Number.isFinite(v))
  if (values.length < 2) return undefined
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (max === min) return undefined
  if (higherIsBetter) {
    if (value === max) return 'best'
    if (value === min) return 'worst'
  } else {
    // lower personal funding required is better
    if (value === min) return 'best'
    if (value === max) return 'worst'
  }
  return undefined
}

export function ScenarioCompare({ rows, currency, activeScenarioId }: ScenarioCompareProps) {
  if (rows.length < 2) return null

  return (
    <section className="section">
      <h2>Scenario comparison</h2>
      <p className="cash-timing-note">
        Focused on cash peace of mind. Highlights mark clearer wins on cash and operating
        profit — not revenue alone.
      </p>
      <div className="table-wrap">
        <table className="pl-table compare-table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th className="num">Cash after mo. 1</th>
              <th className="num">Lowest cash</th>
              <th>Lowest month</th>
              <th className="num">Personal funding needed</th>
              <th>First negative cash</th>
              <th className="num">Ending cash</th>
              <th className="num">Op. profit/loss</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.scenarioId}
                className={
                  row.scenarioId === activeScenarioId ? 'is-active-scenario' : undefined
                }
              >
                <td>{row.scenarioName}</td>
                <td
                  className={`num tone-${highlightTone(rows, 'cashAfterMonthOne', row.cashAfterMonthOne, true) ?? 'none'}`}
                >
                  {formatMoney(row.cashAfterMonthOne, currency)}
                </td>
                <td
                  className={`num tone-${highlightTone(rows, 'lowestCash', row.lowestCash, true) ?? 'none'}`}
                >
                  {formatMoney(row.lowestCash, currency)}
                </td>
                <td>{row.lowestCashMonthLabel ?? '—'}</td>
                <td
                  className={`num tone-${highlightTone(rows, 'personalFundingRequired', row.personalFundingRequired, false) ?? 'none'}`}
                >
                  {row.personalFundingRequired === 0
                    ? 'None'
                    : formatMoney(row.personalFundingRequired, currency)}
                </td>
                <td>{row.firstNegativeCashMonthLabel ?? 'None'}</td>
                <td
                  className={`num tone-${highlightTone(rows, 'endingCash', row.endingCash, true) ?? 'none'}`}
                >
                  {formatMoney(row.endingCash, currency)}
                </td>
                <td
                  className={`num tone-${highlightTone(rows, 'operatingProfit', row.operatingProfit, true) ?? 'none'}`}
                >
                  {formatMoney(row.operatingProfit, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
