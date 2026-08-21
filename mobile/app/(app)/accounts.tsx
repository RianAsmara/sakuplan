import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, YStack } from 'tamagui'
import { useAccountBalances } from '../../src/accounts/useAccountBalances'
import { useAccounts } from '../../src/accounts/useAccounts'
import { accountTypeLabel } from '../../src/accounts/accountTypeLabels'
import { DetailHeader } from '../../src/components/AppHeader'
import { Amount, Body, LedgerRow, Meta, MetaS, Screen } from '../../src/components/primitives'
import { formatRupiah } from '../../src/format/money'

export default function AccountsScreen() {
  const accounts = useAccounts()
  const accountIds = (accounts.data ?? []).map((account) => account.id)
  const balances = useAccountBalances(accountIds)

  const totalBalance = [...balances.balancesById.values()].reduce((sum, value) => sum + value, 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <DetailHeader title="Akun & saldo" />
      <ScrollView flex={1} backgroundColor="$kertas">
        <Screen>
          {accounts.isLoading || balances.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$terjaga" />
            </YStack>
          ) : accounts.isError || balances.isError ? (
            <Meta color="$peringatan">Gagal memuat akun. Coba lagi nanti.</Meta>
          ) : (
            <YStack>
              <YStack marginBottom="$4">
                <Meta>Total saldo</Meta>
                <Amount size={28}>{formatRupiah(totalBalance)}</Amount>
              </YStack>

              {(accounts.data ?? []).map((account) => (
                <LedgerRow key={account.id} pv={13}>
                  <YStack>
                    <Body>{account.name}</Body>
                    <MetaS>{accountTypeLabel(account.type)}</MetaS>
                  </YStack>
                  <Amount size={16}>
                    {formatRupiah(balances.balancesById.get(account.id) ?? 0)}
                  </Amount>
                </LedgerRow>
              ))}
            </YStack>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
