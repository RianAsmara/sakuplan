export function formatRupiah(minorUnits: number): string {
  const rounded = Math.round(minorUnits)
  const negative = rounded < 0
  const digits = Math.abs(rounded).toLocaleString('id-ID')
  return `${negative ? '-' : ''}Rp${digits}`
}
