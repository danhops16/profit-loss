# Year-one P&L — codebase audit

Full walkthrough of what exists today so we can pick what to improve.

**Live site:** https://danhops16.github.io/profit-loss/  
**Repo:** https://github.com/danhops16/profit-loss

---

## Overview

A single-page Vite + React + TypeScript planner for a startup’s first 12 months. You enter revenue and expense lines, it computes monthly net and cash, and shows a dashboard + charts + table. State lives in `localStorage`. Deployed via GitHub Actions to GitHub Pages.

| Metric | Value |
|--------|--------|
| App source files | ~12 |
| Runtime npm deps | 3 (react, react-dom, recharts) |
| Tests | 0 |
| Deploy workflows | 1 |

### Stack

| Layer | Choice | Notes |
|-------|--------|--------|
| Build | Vite 8 | `base` path via `VITE_BASE_PATH` for Pages |
| UI | React 19 | No router — one page |
| Language | TypeScript | Strict project references (`tsc -b`) |
| Charts | Recharts 3 | ~586 KB JS bundle (largest cost) |
| Storage | localStorage | Key: `profit-loss-planner-v1` |
| Host | GitHub Pages | `.github/workflows/deploy.yml` |

### What works well today

- Clear separation: types → calculations → hook → presentational components
- Three fill modes (uniform / growth / manual) cover most planning styles without a spreadsheet UI
- Export/import JSON + auto-save make the tool usable without a backend
- Deploy path is correct for project Pages (`/danhops16.github.io/profit-loss/`)

---

## Architecture

### Data flow (one direction)

```
User edits → usePlanner state → buildSummaries → Dashboard / Charts / Table
```

`App.tsx` owns composition only. It never computes P&L itself — that lives in `utils/calculations.ts`. Mutations go through `usePlanner` helpers.

1. Header / LineItemSection call `onUpdate` / `updateLineItem`
2. `usePlanner` `setState` + persist to localStorage
3. App re-renders; `buildSummaries(state)` runs every render
4. Dashboard, Charts, MonthlyTable receive `MonthSummary[]`
5. ExportBar reads raw `PlannerState` for JSON dump

### Module map

**Domain (core)**

| File | Role |
|------|------|
| `src/types.ts` | `LineItem`, `PlannerState`, `MonthSummary` |
| `src/utils/calculations.ts` | `resolveAmounts`, `buildSummaries`, currency formatters |
| `src/hooks/usePlanner.ts` | CRUD + load/save |

**Presentation (view)**

| Component | Role |
|-----------|------|
| `Header` | Setup fields |
| `LineItemSection` | Edit lines |
| `Dashboard` | KPI cards |
| `Charts` | Recharts visuals |
| `MonthlyTable` | 12-month grid |
| `ExportBar` | Import / export / reset |

### Architectural gaps

- No validation layer on import or localStorage load — malformed JSON that still parses can put `NaN` / missing fields into the UI
- No tests guard the math (growth compounding, year rollover, cash runway)

---

## File map

| File | Role | Lines of interest |
|------|------|-------------------|
| `src/App.tsx` | Composition root | Wires hook + presets; layout order |
| `src/types.ts` | Shared contracts | `FillMode`, `LineItem`, `PlannerState` |
| `src/hooks/usePlanner.ts` | State machine | `defaultState`, load/save, CRUD |
| `src/utils/calculations.ts` | P&L math | `resolveAmounts`, `buildSummaries` |
| `src/components/Header.tsx` | Business setup | name, start month/year, cash |
| `src/components/LineItemSection.tsx` | Editor | Section + `LineItemCard` + fill modes |
| `src/components/Dashboard.tsx` | KPIs | Totals, burn, first profit month |
| `src/components/Charts.tsx` | Visuals | Bar / Area / Line via Recharts |
| `src/components/MonthlyTable.tsx` | Detail grid | 12 rows + year footer totals |
| `src/components/ExportBar.tsx` | Persistence UX | JSON download/upload, reset |
| `src/App.css` + `index.css` | Theme & layout | CSS variables, dark UI |
| `vite.config.ts` | Build | `base = VITE_BASE_PATH ?? '/'` |
| `.github/workflows/deploy.yml` | CI deploy | `npm ci` → build → Pages artifact |

### Not present (yet)

No router, no auth, no API, no unit tests, no scenario compare, no multi-currency, no tax/COGS split, no CSV export.

---

## Data model

### `PlannerState`

| Field | Type | Meaning |
|-------|------|---------|
| `businessName` | string | Display label only |
| `startMonth` | 0–11 | Calendar month for month 1 |
| `startYear` | number | Year of month 1 |
| `startingCash` | number | Opening balance before month 1 net |
| `revenue` | `LineItem[]` | Income streams |
| `expenses` | `LineItem[]` | Cost streams |

### `LineItem`

| Field | Used when |
|-------|-----------|
| `id` | Always — React key + updates |
| `name` | Always — label |
| `fillMode` | Chooses which fields drive the 12 months |
| `uniformAmount` | `uniform` + `growth` (month-1 base) |
| `growthPercent` | `growth` only (MoM compound) |
| `amounts[12]` | `manual` only — uniform/growth ignore it |

**Design note:** Unused fields stay on the object when you switch modes (e.g. manual amounts survive if you flip to uniform). That is intentional for UX, but import validation should still normalize length and types.

### `MonthSummary` (derived, not stored)

`label`, `revenue`, `expenses`, `net` (= rev − exp), `cumulative` cash (`startingCash` + running nets). Built fresh on every render from `PlannerState`.

---

## Calculations & state

### `resolveAmounts(line)`

| Mode | Formula |
|------|---------|
| `uniform` | 12 × `uniformAmount` |
| `growth` | m0 = `uniformAmount`; each next ×= `(1 + growth%/100)`; rounded to cents |
| `manual` | `amounts[0..11]` padded with zeros |

### `buildSummaries(state)`

1. Sum all revenue lines per month
2. Sum all expense lines
3. `net = revenue − expenses`
4. Cash starts at `startingCash` and adds `net` each month
5. Calendar labels roll year correctly when `startMonth + i ≥ 12` (e.g. start Oct 2026 → Sep 2027)

### State hook quirks

| Behavior | Detail | Risk |
|----------|--------|------|
| `loadState` on first render | `useState(loadState)` — no SSR | Fine for Pages SPA |
| Save every change | `useEffect` writes full JSON | OK; no debounce needed at this size |
| `reset()` | Sets `defaultState` object | Shares same default object ref if mutated later — prefer `structuredClone` |
| `importState` | Shallow merge with default | Does not deep-validate line items |
| `removeLineItem` | UI blocks last remove (`canRemove`) | Hook itself allows empty arrays |

### Metric naming drift

Dashboard **“First profitable month”** is the first month with `net ≥ 0` (monthly profit), **not** cash break-even (`cumulative ≥ 0`).

**“Avg monthly burn”** averages only loss months’ absolute net — useful, but not classic runway burn.

---

## UI layers

### Screen layout (top → bottom)

| # | Block | User job |
|---|-------|----------|
| 1 | Header | Name the business + planning window + opening cash |
| 2 | Dashboard | Read year-level health at a glance |
| 3 | Revenue \| Expenses | Enter / edit line items (main work) |
| 4 | Charts | See trends |
| 5 | Monthly table | Audit exact numbers |
| 6 | Export bar | Backup / restore / wipe |

### UX strengths

- Preset chips speed up common expense/revenue types
- Yearly total per line updates live
- Color coding: green revenue / red expenses
- Responsive: stacks columns under ~900px

### UX friction

- Dashboard sits above editors — numbers update after scroll
- Manual months labeled M1–M12, not Jan–Dec
- Currency hard-coded USD
- `confirm()` / `alert()` for reset & import errors
- No undo; reset wipes immediately after confirm

### Styling

Dark theme via CSS variables in `index.css` (DM Sans + JetBrains Mono). `App.css` holds component layout. No component library — intentional for a small Pages site.

---

## Suggested improvement backlog

Ordered by leverage for a first-year planning tool.

### P0 — Correctness & trust

| Idea | Why |
|------|-----|
| Unit tests for `resolveAmounts` + `buildSummaries` | Locks growth math, year rollover, cash chain |
| Validate import / localStorage shape | Prevents silent `NaN` and broken line items |
| Clarify dashboard metrics | Rename or add cash break-even vs first profitable month |
| Clone `defaultState` on reset | Avoid shared mutable default object |

### P1 — Planning power

| Idea | Why |
|------|-----|
| COGS / gross margin (or expense categories) | Real P&L usually separates cost of goods |
| One-time vs recurring costs | Launch spend vs monthly burn |
| Runway estimate (months until cash = 0) | Most founders ask this first |
| Scenario A/B (optimistic / base / lean) | Compare plans without overwriting |
| CSV export | Drop into Sheets / Excel / investors |

### P2 — UX polish

| Idea | Why |
|------|-----|
| Sticky summary bar while editing | Keep net/cash visible without scrolling |
| Month labels = actual calendar months | Less mental mapping than M1–M12 |
| Currency / locale selector | Not everyone plans in USD |
| Code-split Recharts | Smaller first paint (~586 KB chunk today) |
| Light mode toggle | Dark-only may not suit printing / daytime use |

---

## How to use this audit

Pick a priority band or a specific row (e.g. “add runway + fix metric labels” or “tests first”) and implement that slice next.
