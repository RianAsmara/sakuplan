export function formatRupiah(minorUnits: number): string {
  const rounded = Math.round(minorUnits)
  const negative = rounded < 0
  const digits = Math.abs(rounded).toLocaleString('id-ID')
  return `${negative ? '-' : ''}Rp${digits}`
}

export function parseRupiahInput(raw: string): number {
  const digitsOnly = raw.replace(/[^0-9]/g, '')
  if (digitsOnly === '') return 0
  return Number.parseInt(digitsOnly, 10)
}
