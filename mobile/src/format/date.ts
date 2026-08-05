export function toRFC3339(date: Date): string {
  return date.toISOString()
}

export function formatDateID(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatMonthYearID(date: Date): string {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export function daysAgo(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() - days)
  return copy
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
