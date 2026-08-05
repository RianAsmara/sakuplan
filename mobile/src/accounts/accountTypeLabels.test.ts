import { accountTypeLabel } from './accountTypeLabels'

describe('accountTypeLabel', () => {
  it('maps every AccountType enum value to Indonesian copy', () => {
    expect(accountTypeLabel('cash')).toBe('Tunai')
    expect(accountTypeLabel('bank')).toBe('Bank')
    expect(accountTypeLabel('ewallet')).toBe('E-Wallet')
    expect(accountTypeLabel('savings')).toBe('Tabungan')
    expect(accountTypeLabel('other')).toBe('Lainnya')
  })
})
