import { billUrgency } from './billUrgency'

describe('billUrgency', () => {
  const now = new Date('2026-08-04T00:00:00')

  it('flags a past due date as overdue, in danger color', () => {
    const result = billUrgency('2026-08-01T00:00:00', now)
    expect(result.color).toBe('$danger')
    expect(result.label).toBe('Terlambat 3 hari')
  })

  it('labels a future due date with days remaining, in muted color', () => {
    const result = billUrgency('2026-08-10T00:00:00', now)
    expect(result.color).toBe('$kulit')
    expect(result.label).toBe('Jatuh tempo 6 hari lagi')
  })

  it('labels a due date of today as due today', () => {
    const result = billUrgency('2026-08-04T00:00:00', now)
    expect(result.color).toBe('$kulit')
    expect(result.label).toBe('Jatuh tempo hari ini')
  })
})
