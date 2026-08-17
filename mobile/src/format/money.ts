export function formatRupiah(minorUnits: number): string {
  const rounded = Math.round(minorUnits)
  const negative = rounded < 0
  const digits = String(Math.abs(rounded))
  let grouped = ''
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) grouped += '.'
    grouped += digits[i]
  }
  return `${negative ? '-' : ''}Rp${grouped}`
}

export function parseRupiahInput(raw: string): number {
  const digitsOnly = raw.replace(/[^0-9]/g, '')
  if (digitsOnly === '') return 0
  return Number.parseInt(digitsOnly, 10)
}
