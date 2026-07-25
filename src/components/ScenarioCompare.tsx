import type { CurrencyCode, ScenarioComparisonRow } from '../types'
import { formatMargin, formatMoney } from '../utils/formatMoney'

interface ScenarioCompareProps {
  rows: ScenarioComparisonRow[]
  currency: CurrencyCode
  activeScenarioId: string
}

type NumericKey = keyof Pick<
  ScenarioComparisonRow,
  | 'grossProfit'
  | 'grossMargin'
  | 'yearNet'
  | 'netMargin'
  | 'endingCash'
  | 'lowestCash'
  | 'runwayMonths'
>

/** Higher is better for these metrics. */
const HIGHER_BETTER: NumericKey[] = [
  'grossProfit',
  'grossMargin',
  'yearNet',
  'netMargin',
  'endingCash',
  'lowestCash',
  'runwayMonths',
]

function highlightTone(
  rows: ScenarioComparisonRow[],
  key: NumericKey,
  value: number | null,
): 'best' | 'worst' | undefined {
  if (!HIGHER_BETTER.includes(key)) return undefined

  const values = rows.map((r) => {
    const v = r[key]
    if (key === 'runwayMonths' && v === null) return Number.POSITIVE_INFINITY
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  })
  const finite = values.filter((v): v is number => v !== null)
  if (finite.length < 2) return undefined

  const comparable =
    key === 'runwayMonths' && value === null
      ? Number.POSITIVE_INFINITY
      : value
  if (comparable === null) return undefined
  if (typeof comparable !== 'number') return undefined
  if (!Number.isFinite(comparable) && comparable !== Number.POSITIVE_INFINITY) {
    return undefined
  }

  const max = Math.max(...finite)
  const min = Math.min(...finite)
  if (max === min) return undefined
  if (comparable === max) return 'best'
  if (comparable === min) return 'worst'
  return undefined
}

export function ScenarioCompare({ rows, currency, activeScenarioId }: ScenarioCompareProps) {
  if (rows.length < 2) {
    return (
      <section className="section">
        <h2>Scenario comparison</h2>
        <p className="empty-hint">
          Add another scenario to compare annual results side by side.
        </p>
      </section>
    )
  }

  return (
    <section className="section">
      <h2>Scenario comparison</h2>
      <p className="cash-timing-note">
        Highlights mark clearer wins/losses (profit, margins, cash, runway) — not
        revenue alone.
      </p>
      <div className="table-wrap">
        <table className="pl-table compare-table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th className="num">Revenue</th>
              <th className="num">Gross profit</th>
              <th className="num">Gross margin</th>
              <th className="num">Total expenses</th>
              <th className="num">Net profit</th>
              <th className="num">Net margin</th>
              <th className="num">Ending cash</th>
              <th className="num">Lowest cash</th>
              <th>Runway</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.scenarioId}
                className={row.scenarioId === activeScenarioId ? 'is-active-scenario' : undefined}
              >
                <td>{row.scenarioName}</td>
                <td className="num">{formatMoney(row.totalRevenue, currency)}</td>
                <td
                  className={`num tone-${highlightTone(rows, 'grossProfit', row.grossProfit) ?? 'none'}`}
                >
                  {formatMoney(row.grossProfit, currency)}
                </td>
                <td
                  className={`num tone-${highlightTone(rows, 'grossMargin', row.grossMargin) ?? 'none'}`}
                >
                  {formatMargin(row.grossMargin)}
                </td>
                <td className="num">{formatMoney(row.totalExpenses, currency)}</td>
                <td
                  className={`num tone-${highlightTone(rows, 'yearNet', row.yearNet) ?? 'none'}`}
                >
                  {formatMoney(row.yearNet, currency)}
                </td>
                <td
                  className={`num tone-${highlightTone(rows, 'netMargin', row.netMargin) ?? 'none'}`}
                >
                  {formatMargin(row.netMargin)}
                </td>
                <td
                  className={`num tone-${highlightTone(rows, 'endingCash', row.endingCash) ?? 'none'}`}
                >
                  {formatMoney(row.endingCash, currency)}
                </td>
                <td
                  className={`num tone-${highlightTone(rows, 'lowestCash', row.lowestCash) ?? 'none'}`}
                >
                  {formatMoney(row.lowestCash, currency)}
                </td>
                <td
                  className={`tone-${highlightTone(rows, 'runwayMonths', row.runwayMonths) ?? 'none'}`}
                >
                  {row.runwayLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
