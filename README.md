# Year-One P&L Planner

A simple web app to model your startup’s **first-year profit and loss**: monthly revenue, expenses, net profit, and cash balance over 12 months.

Live demo: after you deploy, your site will be at `https://<username>.github.io/profit-loss/` (replace `profit-loss` with your repo name).

## Features

- **Revenue & expense lines** — flat monthly amounts, month-over-month growth %, or custom per-month values
- **Dashboard** — year totals, lowest cash, months at a loss, first profitable month
- **Charts** — revenue vs expenses, cash runway, monthly net
- **Monthly P&L table** — full 12-month breakdown
- **Auto-save** in the browser (localStorage)
- **Export / import** JSON to back up or share scenarios

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy to GitHub Pages

1. Create a GitHub repo (e.g. `profit-loss`) and push this project.
2. In the repo: **Settings → Pages → Build and deployment**
   - Source: **GitHub Actions**
3. Push to `main` (or `master`). The included workflow builds and deploys automatically.

The workflow sets `VITE_BASE_PATH` to `/<repo-name>/` so assets load correctly on GitHub Pages.

### Manual build (optional)

```bash
VITE_BASE_PATH=/profit-loss/ npm run build
```

Upload the `dist/` folder or use any static host.

## Tech stack

- [Vite](https://vite.dev/) + React + TypeScript
- [Recharts](https://recharts.org/) for charts

## License

MIT
