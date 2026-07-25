# Year-one P&L — codebase audit

**Audited:** July 2026 (post correctness-and-trust release)  
**Live site:** https://danhops16.github.io/profit-loss/  
**Repo:** https://github.com/danhops16/profit-loss  
**Branch context:** `cursor/add-codebase-audit` (and local correctness work)

Full walkthrough of what exists **now**, so we can pick the next improvements deliberately.

---

## Overview

A single-page Vite + React + TypeScript planner for a startup’s first 12 months. You enter revenue and expense lines; the app derives monthly net and cash, then shows a dashboard, charts, and a monthly table. State lives in `localStorage` (validated on load). Deployed via GitHub Actions to GitHub Pages.

| Metric | Value |
|--------|--------|
| App source modules (`src/`) | ~15 TS/TSX files |
| Runtime npm deps | 3 (react, react-dom, recharts) |
| Automated tests | **32** (Vitest) |
| Deploy workflows | 1 (GitHub Pages) |

### Stack

| Layer | Choice | Notes |
|-------|--------|--------|
| Build | Vite 8 | `base` via `VITE_BASE_PATH` for Pages |
| UI | React 19 | No router — one page |
| Language | TypeScript | `tsc -b` on build |
| Charts | Recharts 3 | Largest JS chunk (~590 KB) |
| Tests | Vitest 4 | `npm test` / `npm run test:watch` |
| Storage | localStorage | Key: `profit-loss-planner-v1` (unchanged) |
| Host | GitHub Pages | `.github/workflows/deploy.yml` |

### What’s solid today

- Clear domain split: **types → defaults → validation → calculations → hook → views**
- Three fill modes (uniform / growth / manual)
- Untrusted localStorage/import JSON is validated and normalized
- Reset creates a **fresh** default tree (no shared mutable `defaultState`)
- Shared `buildMetrics` for dashboard KPIs (including cash runway)
- Manual month fields use real calendar labels (year-rollover aware)
- Import errors are inline (`role="status"`), not `alert()`
- Vitest covers amounts, summaries, metrics edge cases, and validation

---

## Architecture

### Data flow

```
User edits
  → usePlanner (immutable updates + localStorage write)
  → buildSummaries(state)
  → Dashboard (buildMetrics) / Charts / MonthlyTable

Import path:
  file → parsePlannerJson → importState → setState (or keep plan + error)
```

`App.tsx` composes only. Money math lives in `utils/calculations.ts`. Persistence safety lives in `utils/validatePlannerState.ts`.

### Module map

**Domain**

| File | Role |
|------|------|
| `src/types.ts` | `FillMode`, `LineItem`, `PlannerState`, `MonthSummary` |
| `src/utils/defaults.ts` | `createEmptyLineItem`, `createDefaultState` |
| `src/utils/validatePlannerState.ts` | Parse/normalize untrusted JSON |
| `src/utils/calculations.ts` | Amounts, summaries, labels, metrics, `$` formatters |
| `src/hooks/usePlanner.ts` | CRUD, load/save, reset, import |

**Presentation**

| Component | Role |
|-----------|------|
| `Header` | Business name, start month/year, starting cash |
| `LineItemSection` | Revenue/expense editors + fill modes |
| `Dashboard` | KPI cards via `buildMetrics` |
| `Charts` | Bar / area / line (Recharts) |
| `MonthlyTable` | 12-month P&L grid |
| `ExportBar` | Export / import / reset + status messages |

**Tests**

| File | Focus |
|------|--------|
| `calculations.test.ts` | `resolveAmounts`, `buildSummaries`, `buildMetrics`, labels |
| `validatePlannerState.test.ts` | Coercion, rejection, amount padding, JSON errors |

---

## File map (current)

| Path | Role |
|------|------|
| `src/App.tsx` | Composition; wires presets + `forecastMonthLabels` |
| `src/types.ts` | Shared contracts |
| `src/hooks/usePlanner.ts` | State machine; storage key export |
| `src/utils/defaults.ts` | Fresh defaults factory |
| `src/utils/validatePlannerState.ts` | Trust boundary for JSON |
| `src/utils/calculations.ts` | Deterministic P&L + metrics |
| `src/components/*` | Presentational UI |
| `src/App.css` / `index.css` | Dark theme + layout |
| `vite.config.ts` | Pages `base` + Vitest config |
| `.github/workflows/deploy.yml` | Build + deploy Pages |

### Still not present (by design)

No router, auth, API, scenarios, COGS/categories, multi-currency, CSV export, or light mode.

---

## Data model

### `PlannerState`

| Field | Type | Meaning |
|-------|------|---------|
| `businessName` | string | Display label |
| `startMonth` | 0–11 | Calendar month of forecast month 1 |
| `startYear` | number | Year of month 1 |
| `startingCash` | number | Opening cash before month-1 net |
| `revenue` | `LineItem[]` | Income lines |
| `expenses` | `LineItem[]` | Cost lines |

### `LineItem`

| Field | Used when |
|-------|-----------|
| `id` | Always |
| `name` | Always |
| `fillMode` | Chooses calculation path |
| `uniformAmount` | `uniform` + `growth` (month-1 base) |
| `growthPercent` | `growth` only |
| `amounts` | `manual` only (always length 12 after normalize) |

Switching fill modes keeps unused fields on the object (UX-friendly). Load/import always re-normalizes `amounts` to 12 finite numbers.

### Derived (not stored)

- **`MonthSummary`**: `label`, `revenue`, `expenses`, `net`, `cumulative`
- **`PlannerMetrics`**: year totals, lowest cash, first profitable month, average monthly loss, runway label

---

## Calculations & metrics

### `resolveAmounts`

| Mode | Behavior |
|------|----------|
| `uniform` | 12 × finite `uniformAmount` |
| `growth` | Compound MoM from month 1; round to cents each month; non-finite → 0 |
| `manual` | 12 cells from `amounts`; pad/truncate; non-finite → 0 |

### `buildSummaries`

Sums revenue and expense lines per month, nets them, runs cash from `startingCash`. Labels from `forecastMonthLabels` (handles year rollover).

### `buildMetrics` (authoritative definitions)

| Metric | Definition |
|--------|------------|
| First profitable month | First month with **net > 0** (strict); else “Not in year 1” |
| Average monthly loss | Mean of \|net\| over months with **net < 0**; else `$0` |
| Cash runway | If starting cash **&lt; 0** → `Already negative`; else first month with **ending cash &lt; 0**; else `12+ months` |

---

## Persistence & trust

| Path | Behavior |
|------|----------|
| localStorage load | `parsePlannerJson`; on failure → `createDefaultState()` |
| Import file | Parse/validate; on failure → **keep current plan** + inline error |
| Reset | `confirm()` then `createDefaultState()` (new object graph) |
| Export | Download current `PlannerState` as JSON |

### Validation choices

- Root must be an object; `revenue` / `expenses` must be arrays
- Numeric strings coerced; invalid `fillMode` → `uniform`
- `startMonth` clamped to 0–11; year outside 1970–2200 → fallback year
- Non-object line entries dropped; if array had only junk → reject array
- No extra runtime schema library (hand-rolled, dependency-free)

---

## UI layers

| # | Block | Job |
|---|-------|-----|
| 1 | Header | Setup window + opening cash |
| 2 | Dashboard | Year-level KPIs + runway |
| 3 | Revenue \| Expenses | Main editing |
| 4 | Charts | Trends |
| 5 | Monthly table | Exact audit |
| 6 | Export bar | Backup / restore / wipe + status |

### UX notes

- Manual cells labeled with real months (e.g. `Jan 2027`), not `M1`–`M12`
- Month grid uses `minmax(0, 1fr)`; 3 columns on small screens
- Line name inputs and remove buttons have accessible names; fill modes use a `fieldset`
- Starting-cash input still has `min={0}` in the UI (negative cash mainly via import)

---

## Suggested improvement backlog

P0 from the prior audit is largely **done**. Next candidates:

### P1 — Planning power

| Idea | Why |
|------|-----|
| Runway in months (numeric) + burn clarification | Founders often want “N months left” as a number |
| One-time vs recurring costs | Launch spend vs monthly burn |
| Expense/revenue categories or COGS | Closer to a real P&L |
| Scenario A/B (base / lean / optimistic) | Compare without overwriting |
| CSV export | Sheets / Excel / investors |

### P2 — UX & delivery

| Idea | Why |
|------|-----|
| Sticky summary while editing | Net/cash always visible |
| Allow negative starting cash in the Header UI | Align UI with runway edge case |
| Currency / locale selector | Not everyone plans in USD |
| Code-split Recharts | Smaller first paint |
| Light mode / print stylesheet | Daytime use and printing |
| Component tests (ExportBar / Dashboard) | Catch wiring regressions |

### P3 — Hygiene

| Idea | Why |
|------|-----|
| Update this audit when shipping major slices | Keep planning docs honest |
| Optional `npm audit` / dependency bumps | Vitest/Vite notices over time |

---

## How to use this audit

1. Pick a backlog row (or a small theme like “CSV + sticky summary”).
2. Implement that slice without expanding scope.
3. Keep calculations in `utils/` with Vitest coverage.
4. Revisit this file after the next meaningful release.

### Local commands

```bash
npm run dev          # local app
npm test             # Vitest once
npm run test:watch   # Vitest watch
npm run build        # tsc + production bundle
npm run lint         # ESLint
```
