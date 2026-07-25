# Year-one P&L — codebase audit

**Audited:** July 2026 (forecasting-tool release)  
**Live site:** https://danhops16.github.io/profit-loss/  
**Repo:** https://github.com/danhops16/profit-loss

Practical first-year profit-and-loss forecasting: multi-scenario plans, COGS / gross profit, one-time items, currency display, CSV export, and validated localStorage migration.

---

## Overview

| Metric | Value |
|--------|--------|
| Schema version | **2** (multi-scenario) |
| Storage key | `profit-loss-planner-v1` (unchanged) |
| Runtime deps | react, react-dom, recharts |
| Tests | Vitest (`npm test`) |
| Deploy | GitHub Actions → GitHub Pages |

### Stack

| Layer | Choice | Notes |
|-------|--------|--------|
| Build | Vite 8 | `VITE_BASE_PATH` for Pages; charts lazy-loaded |
| UI | React 19 | Single page, no router |
| Domain | Pure TS utils | Calculations, validation, scenarios, CSV, money |
| Charts | Recharts (async chunk) | Not in the initial JS bundle |

### What’s solid

- Schema v2 with backward-compatible migration from unversioned v1 plans
- Expense categories including COGS → gross profit / OpEx / net
- One-time fill mode (amount + forecast month)
- Named scenarios (create / duplicate / rename / switch / delete)
- Shared `buildMetrics` (margins, numeric runway, cash milestones)
- Currency formatting (USD/CAD/EUR/GBP/AUD) — display only, no FX conversion
- JSON + CSV export; validated import with inline errors
- Sticky summary while editing; calendar month labels; a11y basics

---

## Architecture

```
User edits
  → usePlanner (immutable scenario updates + localStorage)
  → buildSummaries / buildMetrics / compareScenarios
  → Dashboard, sticky bar, charts, table, comparison

Import:
  JSON → parsePlannerState (migrate if needed) → setState | keep plan + error
```

### Domain modules

| File | Role |
|------|------|
| `src/types.ts` | Schema v2 types, categories, currencies |
| `src/utils/defaults.ts` | Fresh factories + `getActiveScenario` |
| `src/utils/validatePlannerState.ts` | Untrusted JSON → normalized v2 state |
| `src/utils/calculations.ts` | Amounts, P&L summaries, metrics, compare |
| `src/utils/scenarios.ts` | Pure scenario mutations |
| `src/utils/formatMoney.ts` | `Intl` money + margin (`—` when N/A) |
| `src/utils/csvExport.ts` | Active-scenario CSV builder |
| `src/hooks/usePlanner.ts` | React state + persistence |

### UI modules

| Component | Role |
|-----------|------|
| `Header` | Shared business setup + currency |
| `ScenarioBar` | Scenario CRUD / switch |
| `StickySummary` | Compact live KPIs |
| `Dashboard` | Full year-one snapshot |
| `LineItemSection` | Revenue/expense editors |
| `Charts` / `ChartsInner` | Lazy Recharts visuals |
| `MonthlyTable` | Structured monthly P&L |
| `ScenarioCompare` | Side-by-side scenario KPIs |
| `ExportBar` | JSON / CSV / import / reset |

---

## Data model (schema v2)

### `PlannerState` (shared across scenarios)

| Field | Meaning |
|-------|---------|
| `schemaVersion` | `2` |
| `businessName` | Display name |
| `startMonth` / `startYear` | Forecast window start |
| `startingCash` | Opening cash (may be negative) |
| `currency` | Display currency code |
| `activeScenarioId` | Selected scenario |
| `scenarios[]` | Independent forecasts |

### `Scenario`

| Field | Meaning |
|-------|---------|
| `id` / `name` | Identity |
| `revenue[]` | `LineItem`s |
| `expenses[]` | `ExpenseLineItem`s (with `category`) |

### `LineItem` fill modes

`uniform` | `growth` | `one-time` | `manual`

One-time uses `uniformAmount` + `oneTimeMonth` (0–11). Other mode fields are preserved when switching.

### Expense categories

`cogs` · `payroll` · `marketing` · `facilities` · `software` · `professional` · `taxes` · `other`

---

## Financial definitions

| Concept | Definition |
|---------|------------|
| **COGS** | Expense lines with `category === 'cogs'` |
| **Gross profit** | Revenue − COGS |
| **Operating expenses** | All non-COGS expenses |
| **Total expenses** | COGS + OpEx |
| **Net profit** | Gross profit − OpEx (= Revenue − total expenses) |
| **Gross / net margin** | Part ÷ revenue; **`—`** when revenue is 0 |
| **Ending cash** | Starting cash + cumulative monthly net |
| **Cash timing** | Assumed paid in the same forecast month (noted in UI) |
| **First profitable month** | First month with **net > 0** |
| **Average monthly loss** | Mean \|net\| over loss months (not labeled “burn”) |
| **Runway** | See below |

### Runway

| Situation | Label |
|-----------|--------|
| Starting cash &lt; 0 | `0 months — already negative` |
| Month 1 ending cash &lt; 0 | `0 full months` |
| First negative ending cash at index `i` | `i full month(s)` |
| Never negative in year 1 | `12+ months` |
| Ending cash exactly 0 | Still non-negative (runway continues) |

---

## Migration strategy

**Storage key stays** `profit-loss-planner-v1`.

| Incoming shape | Behavior |
|----------------|----------|
| Unversioned / no `scenarios` (v1) | Wrap `revenue`/`expenses` into scenario **Base**; `currency: USD`; expense `category: other`; add `oneTimeMonth: 0`; set `schemaVersion: 2` |
| `schemaVersion: 2` / has `scenarios` | Normalize in place |
| Invalid JSON / shape | Load → fresh defaults; Import → **keep current plan** + inline error |

Preserved on migrate: business name, dates, starting cash, line names/IDs, fill modes, amounts, growth rates, totals (via same math).

---

## Suggested next backlog

| Idea | Why |
|------|-----|
| Numeric runway tooltip with month of cash-out | Extra clarity |
| Print / light stylesheet | Offline sharing |
| Optional scenario notes | Document assumptions |
| Deeper component tests for import status | UI regression guard |

### Still out of scope (intentional)

Auth, backend, routing, tax engines, AR/AP timing, inventory, multi-year, FX conversion, component libraries.

---

## Local commands

```bash
npm run dev
npm test
npm run lint
npm run build
VITE_BASE_PATH=/profit-loss/ npm run build   # Pages-shaped bundle
```
