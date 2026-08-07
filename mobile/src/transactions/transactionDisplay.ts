import { formatRupiah } from '../format/money'
import type { components } from '../api/client'

type TransactionType = components['schemas']['TransactionType']

export function transactionTypeMeta(type: TransactionType): { label: string; color: string; sign: -1 | 0 | 1 } {
  switch (type) {
    case 'income':
      return { label: 'Pemasukan', color: '$primary', sign: 1 }
    case 'expense':
      return { label: 'Pengeluaran', color: '$danger', sign: -1 }
    case 'transfer':
      return { label: 'Transfer', color: '$kulit', sign: 0 }
    case 'adjustment':
      return { label: 'Penyesuaian', color: '$accent', sign: 0 }
    case 'reversal':
      return { label: 'Pembatalan', color: '$danger', sign: 0 }
  }
}

export function formatSignedRupiah(type: TransactionType, amount: number): string {
  const { sign } = transactionTypeMeta(type)
  if (sign === 0) return formatRupiah(amount)
  const formatted = formatRupiah(sign * amount)
  return sign === 1 ? `+${formatted}` : formatted
}
