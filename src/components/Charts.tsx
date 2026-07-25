import { lazy, Suspense } from 'react'
import type { MonthSummary } from '../types'

const ChartsInner = lazy(() =>
  import('./ChartsInner').then((m) => ({ default: m.ChartsInner })),
)

interface ChartsProps {
  summaries: MonthSummary[]
}

export function Charts({ summaries }: ChartsProps) {
  return (
    <section className="charts" aria-label="Visual overview">
      <h2>Visual overview</h2>
      <Suspense
        fallback={
          <p className="charts-loading" role="status" aria-live="polite">
            Loading charts…
          </p>
        }
      >
        <ChartsInner summaries={summaries} />
      </Suspense>
    </section>
  )
}
