interface TrendPoint {
  bucket_start: string
  income: number
  expenses: number
}

interface CategorySpend {
  category_id: string
  name: string
  amount: number
}

interface BudgetVsActualLine {
  category_id: string
  name: string
  budgeted: number
  actual: number
}

interface ChartPoint {
  value: number
  label: string
}

interface ChartBar {
  value: number
  label?: string
  frontColor: string
  spacing: number
}

function shortDayLabelID(iso: string): string {
  // timeZone is pinned to Asia/Jakarta (this app's fixed timezone) so the
  // rendered day/month don't shift on hosts with a UTC offset < +7, where an
  // unqualified toLocaleDateString would otherwise render the previous local
  // calendar day for a UTC midnight timestamp.
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })
}

export function toTrendLines(trend: TrendPoint[]): { income: ChartPoint[]; expenses: ChartPoint[] } {
  return {
    income: trend.map((point) => ({ value: point.income, label: shortDayLabelID(point.bucket_start) })),
    expenses: trend.map((point) => ({ value: point.expenses, label: shortDayLabelID(point.bucket_start) })),
  }
}

export function toCategoryBarData(
  categories: CategorySpend[],
  color: string,
  limit = 6
): { value: number; label: string; frontColor: string }[] {
  return [...categories]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((category) => ({ value: category.amount, label: category.name, frontColor: color }))
}

export function toBudgetVsActualBarData(
  lines: BudgetVsActualLine[],
  colors: { budgeted: string; actualOver: string; actualUnder: string }
): ChartBar[] {
  const bars: ChartBar[] = []
  lines.forEach((line, index) => {
    const overBudget = line.actual > line.budgeted
    bars.push({ value: line.budgeted, label: line.name, frontColor: colors.budgeted, spacing: 2 })
    bars.push({
      value: line.actual,
      frontColor: overBudget ? colors.actualOver : colors.actualUnder,
      spacing: index === lines.length - 1 ? 0 : 20,
    })
  })
  return bars
}
