import { formatRupiah } from '../format/money'
import type { components } from '../api/client'

type TransactionType = components['schemas']['TransactionType']

export function transactionTypeMeta(type: TransactionType): { label: string; color: string; sign: -1 | 0 | 1 } {
  switch (type) {
    case 'income':
      return { label: 'Pemasukan', color: '$terjaga', sign: 1 }
    case 'expense':
      // STATES.md: expense rows render in tinta (default text), not a warning color.
      return { label: 'Pengeluaran', color: '$tinta', sign: -1 }
    case 'transfer':
      return { label: 'Transfer', color: '$kulit', sign: 0 }
    case 'adjustment':
      // leluasa is reserved for savings goals and AI suggestions only — neutral kulit here.
      return { label: 'Penyesuaian', color: '$kulit', sign: 0 }
    case 'reversal':
      return { label: 'Pembatalan', color: '$peringatan', sign: 0 }
  }
}

export function formatSignedRupiah(type: TransactionType, amount: number): string {
  const { sign } = transactionTypeMeta(type)
  if (sign === 0) return formatRupiah(amount)
  const formatted = formatRupiah(sign * amount)
  return sign === 1 ? `+${formatted}` : formatted
}
