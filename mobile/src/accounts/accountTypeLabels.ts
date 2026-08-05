import type { components } from '../api/client'

type AccountType = components['schemas']['AccountType']

export const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'ewallet', 'savings', 'other']

export function accountTypeLabel(type: AccountType): string {
  switch (type) {
    case 'cash':
      return 'Tunai'
    case 'bank':
      return 'Bank'
    case 'ewallet':
      return 'E-Wallet'
    case 'savings':
      return 'Tabungan'
    case 'other':
      return 'Lainnya'
  }
}
