import { lazy, Suspense, useState } from 'react'
import type { CurrencyCode, MonthSummary } from '../types'

const ChartsInner = lazy(() =>
  import('./ChartsInner').then((m) => ({ default: m.ChartsInner })),
)

interface ChartsProps {
  summaries: MonthSummary[]
  currency: CurrencyCode
  cashBuffer: number
  openingCash: number
}

export function Charts({ summaries, currency, cashBuffer, openingCash }: ChartsProps) {
  const [view, setView] = useState<'operating' | 'cash'>('cash')

  return (
    <section className="charts" aria-label="Visual overview">
      <div className="section-head">
        <h2>Visual overview</h2>
        <div className="workspace-tabs" role="tablist" aria-label="Chart view">
          <button
            type="button"
            role="tab"
            className={`workspace-tab${view === 'cash' ? ' is-active' : ''}`}
            aria-selected={view === 'cash'}
            onClick={() => setView('cash')}
          >
            Cash view
          </button>
          <button
            type="button"
            role="tab"
            className={`workspace-tab${view === 'operating' ? ' is-active' : ''}`}
            aria-selected={view === 'operating'}
            onClick={() => setView('operating')}
          >
            Operating view
          </button>
        </div>
      </div>
      <Suspense
        fallback={
          <p className="charts-loading" role="status" aria-live="polite">
            Loading charts…
          </p>
        }
      >
        <ChartsInner
          summaries={summaries}
          currency={currency}
          view={view}
          cashBuffer={cashBuffer}
          openingCash={openingCash}
        />
      </Suspense>
    </section>
  )
}
