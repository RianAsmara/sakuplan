import { addMonths, daysAgo, endOfMonth, formatDateID, formatMonthYearID, startOfMonth, toDateOnly, toRFC3339 } from './date'

describe('toRFC3339', () => {
  it('renders an ISO 8601 UTC timestamp', () => {
    expect(toRFC3339(new Date('2026-08-05T00:00:00.000Z'))).toBe('2026-08-05T00:00:00.000Z')
  })
})

describe('formatDateID', () => {
  it('formats a date with an abbreviated Indonesian month', () => {
    expect(formatDateID('2026-08-05T00:00:00.000Z')).toBe('5 Agu 2026')
  })
})

describe('formatMonthYearID', () => {
  it('formats a full Indonesian month and year', () => {
    expect(formatMonthYearID(new Date('2026-08-05T00:00:00.000Z'))).toBe('Agustus 2026')
  })
})

describe('startOfMonth / endOfMonth', () => {
  it('returns the first calendar day of the month at midnight', () => {
    const start = startOfMonth(new Date(2026, 7, 15))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(7)
    expect(start.getDate()).toBe(1)
  })

  it('returns the last calendar day of the month at midnight', () => {
    const end = endOfMonth(new Date(2026, 7, 15))
    expect(end.getMonth()).toBe(7)
    expect(end.getDate()).toBe(31)
  })
})

describe('addMonths', () => {
  it('shifts to the 1st of a month N months away', () => {
    const shifted = addMonths(new Date(2026, 7, 15), -1)
    expect(shifted.getMonth()).toBe(6)
    expect(shifted.getDate()).toBe(1)
  })
})

describe('daysAgo', () => {
  it('subtracts N days from the given date', () => {
    const yesterday = daysAgo(new Date(2026, 7, 5), 1)
    expect(yesterday.getDate()).toBe(4)
  })
})

describe('toDateOnly', () => {
  it('formats local date components as YYYY-MM-DD regardless of time-of-day', () => {
    expect(toDateOnly(new Date(2026, 7, 5, 23, 59))).toBe('2026-08-05')
  })

  it('zero-pads single-digit months and days', () => {
    expect(toDateOnly(new Date(2026, 0, 3))).toBe('2026-01-03')
  })
})
