export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export type FillMode = 'manual' | 'uniform' | 'growth'

export interface LineItem {
  id: string
  name: string
  fillMode: FillMode
  amounts: number[]
  uniformAmount: number
  growthPercent: number
}

export interface PlannerState {
  businessName: string
  startMonth: number
  startYear: number
  startingCash: number
  revenue: LineItem[]
  expenses: LineItem[]
}

export interface MonthSummary {
  label: string
  revenue: number
  expenses: number
  net: number
  cumulative: number
}
