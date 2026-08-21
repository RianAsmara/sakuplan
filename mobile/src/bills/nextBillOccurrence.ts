function candidateFor(dueDay: number, year: number, month: number): Date {
  const clampedDay = Math.max(1, Math.min(31, dueDay))
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(clampedDay, lastDayOfMonth))
}

/** This month's occurrence, regardless of whether it has already passed. */
export function currentBillPeriodDueDate(dueDay: number, now: Date): Date {
  return candidateFor(dueDay, now.getFullYear(), now.getMonth())
}

export function nextBillOccurrence(dueDay: number, now: Date): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisMonth = currentBillPeriodDueDate(dueDay, today)
  if (thisMonth >= today) return thisMonth

  return candidateFor(dueDay, today.getFullYear(), today.getMonth() + 1)
}
