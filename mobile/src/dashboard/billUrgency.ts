import { formatDateID } from '../format/date'

// SCREENS.md §7's 4-branch rule: 'paid' is the first branch, but Bill has no
// status field and there is no mark-paid endpoint, so only these 3 are ever
// reachable against the real API.
export function billUrgency(
  dueDateIso: string,
  now: Date
): { label: string; color: '$peringatan' | '$kulit' } {
  const due = new Date(dueDateIso)
  const days = Math.round((due.getTime() - now.getTime()) / 86_400_000)

  if (days < 0) {
    return { label: `Lewat jatuh tempo ${Math.abs(days)} hari`, color: '$peringatan' }
  }
  if (days === 0) {
    return { label: 'Jatuh tempo hari ini', color: '$peringatan' }
  }
  return { label: `Jatuh tempo ${formatDateID(dueDateIso)} (${days} hari lagi)`, color: '$kulit' }
}
