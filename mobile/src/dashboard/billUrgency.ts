export function billUrgency(
  dueDateIso: string,
  now: Date
): { label: string; color: '$danger' | '$kulit' } {
  const due = new Date(dueDateIso)
  const days = Math.round((due.getTime() - now.getTime()) / 86_400_000)

  if (days < 0) {
    return { label: `Terlambat ${Math.abs(days)} hari`, color: '$danger' }
  }
  if (days === 0) {
    return { label: 'Jatuh tempo hari ini', color: '$kulit' }
  }
  return { label: `Jatuh tempo ${days} hari lagi`, color: '$kulit' }
}
