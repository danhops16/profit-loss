# Year-One Startup Cash Planner — codebase audit

**Audited:** July 2026 (schema v3 cash-first release)  
**Live site:** https://danhops16.github.io/profit-loss/  
**Repo:** https://github.com/danhops16/profit-loss

Cash-first startup forecasting: opening funds, operating vs cash outflows, personal funding required, multi-scenario comparison, and a compact tabbed editor.

---

## Overview

| Metric | Value |
|--------|--------|
| Schema version | **3** |
| Storage key | `profit-loss-planner-v1` (unchanged) |
| Product framing | Planning estimate — not tax/accounting |
| Tests | Vitest |
| Deploy | GitHub Actions → Pages |

### What it answers

1. Cash after month one  
2. Lowest cash balance (and month)  
3. When cash may run out (runway)  
4. Personal funding required vs a desired buffer  
5. Whether operations can cover ongoing bills  
6. Base / Downside / Upside comparison  

---

## Architecture

```
User edits → usePlanner → buildSummaries / buildMetrics / compareScenarios → UI
Import JSON → parsePlannerState (v1/v2/v3) → setState | keep plan + error
```

### Domain

| File | Role |
|------|------|
| `types.ts` | Schema v3 types |
| `defaults.ts` | Factories, opening funds total |
| `validatePlannerState.ts` | Untrusted JSON + migration |
| `calculations.ts` | Amounts, cash/ops summaries, metrics |
| `scenarios.ts` | Scenario mutations |
| `formatMoney.ts` | Currency + margin formatting |
| `csvExport.ts` | Active-scenario CSV |

### UI

| Component | Role |
|-----------|------|
| `Header` | Business setup, currency, buffer, opening funds |
| `PlanActions` | Export/import/reset near top |
| `ScenarioBar` | Scenarios + notes |
| `StickySummary` | Cash-after-m1, lowest, funding needed, ending |
| `Dashboard` | Cash group (6 priority) + ops group |
| `LineWorkspace` | Full-width tabs; collapsed rows |
| `Charts` / `ChartsInner` | Operating vs cash views (lazy) |
| `MonthlyCashTable` | Monthly cash plan |
| `ScenarioCompare` | Hidden unless 2+ scenarios |

---

## Schema v3 model

### Shared `PlannerState`

- `schemaVersion: 3`
- `businessName`, `startMonth`, `startYear`, `currency`
- `cashBuffer` — desired minimum ending cash
- `openingFunds[]` — loan / owner / grant / other sources
- `activeScenarioId`, `scenarios[]`

### `Scenario`

- `notes` — assumptions text  
- `revenue[]`, `expenses[]`, `funding[]` (planned cash inflows)

### Expense fields

- `cashPurpose`: direct | operating | startup | loan_payment | other_outflow  
- `category`: detail tag (payroll, facilities, …)  
- Fill modes: uniform | growth | one-time | percent-revenue | manual  

---

## Cash formulas

Per month:

- Gross contribution = revenue − direct costs  
- Operating profit = revenue − direct − ongoing operating costs  
- Total outflows = direct + operating + startup + loan payments + other outflows  
- Net cash change = revenue + additional funding − total outflows  
- Ending cash = prior ending cash + net cash change  

Startup spending and loan payments **reduce cash** but **do not** reduce operating profit.  
Additional funding **increases cash** but **is not** revenue.

### Personal funding required

`max(0, desired buffer − lowest projected ending cash)`  

Exact equality with the buffer is **not** a shortfall.

---

## Migration

| From | To |
|------|-----|
| v1 flat plan | Base scenario + opening funds from `startingCash` |
| v2 scenarios | Keep scenarios; `startingCash` → one source named **Opening funds** (type `other`); COGS → direct; other expenses → operating; `funding: []`; `notes: ''`; `cashBuffer: 0` |

Values, IDs, fill modes, and currency are preserved. Startup/loan reclassification is left to the user.

---

## UI notes

- Wider desktop container (~1360px)  
- Collapsed line rows with Edit / Duplicate / Remove  
- New lines open automatically; Collapse all available  
- `12-mo total` instead of `/yr`  
- Empty scenario comparison hidden until 2+ scenarios  

---

## Remaining limitations

- No FX conversion, tax engines, AR/AP timing, inventory, multi-year, auth, or backend  
- Chart currency follows selection; some compact axis labels use `Intl` compact notation  
- Live GitHub Pages updates only after merge to `main`  

---

## Commands

```bash
npm test
npm run lint
npm run build
VITE_BASE_PATH=/profit-loss/ npm run build
```
