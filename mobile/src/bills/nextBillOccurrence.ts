export function nextBillOccurrence(dueDay: number, now: Date): Date {
  const clampedDay = Math.max(1, Math.min(31, dueDay))

  function candidateFor(year: number, month: number): Date {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    return new Date(year, month, Math.min(clampedDay, lastDayOfMonth))
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisMonth = candidateFor(today.getFullYear(), today.getMonth())
  if (thisMonth >= today) return thisMonth

  const nextMonthIndex = today.getMonth() + 1
  return candidateFor(today.getFullYear(), nextMonthIndex)
}
