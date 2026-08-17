/**
 * Currency and date formatting.
 *
 * fmtIDR does NOT use Intl / toLocaleString. Hermes ships without full ICU on Android
 * unless you opt in, and `id-ID` grouping silently falls back to en-US separators when it
 * is missing — which turns Rp1.234.567 into Rp1,234,567 on some devices and not others.
 * The prototype used toLocaleString('id-ID'); this is the deterministic equivalent.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

/** Groups thousands with '.', prefixes 'Rp', prefixes '-' for negatives. Rounds to whole rupiah. */
export function fmtIDR(n: number): string {
  const r = Math.round(n || 0)
  const neg = r < 0
  const digits = String(Math.abs(r))
  let out = ''
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += '.'
    out += digits[i]
  }
  return (neg ? '-' : '') + 'Rp' + out
}

/** Same number, with an explicit '+' when positive. Used for the transaction history. */
export function fmtIDRSigned(n: number): string {
  return (n >= 0 ? '+' : '') + fmtIDR(n)
}

/** '2026-08-04' -> '4 Agt' */
export function fmtDate(iso: string): string {
  const d = parseIso(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** '2026-08-04' -> '4 Agt 2026' */
export function fmtDateLong(iso: string): string {
  const d = parseIso(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Parses a date-only ISO string as LOCAL midnight, not UTC. */
export function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

export function toLocalIso(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

/** Strips everything that is not a digit. Every numeric input in the design uses this. */
export function digitsOnly(s: string): string {
  return s.replace(/[^0-9]/g, '')
}

export { MONTHS }
