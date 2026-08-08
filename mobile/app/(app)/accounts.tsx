import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { SubScreenHeader } from '../../src/components/SubScreenHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { useAccounts } from '../../src/accounts/useAccounts'
import { useAccountBalances } from '../../src/accounts/useAccountBalances'
import { accountTypeLabel } from '../../src/accounts/accountTypeLabels'
import { formatRupiah } from '../../src/format/money'

export default function AccountsScreen() {
  const accounts = useAccounts()
  const accountIds = (accounts.data ?? []).map((account) => account.id)
  const balances = useAccountBalances(accountIds)

  const totalBalance = [...balances.balancesById.values()].reduce((sum, value) => sum + value, 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$3">
          <SubScreenHeader title="Akun & Saldo" />

          {accounts.isLoading || balances.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : accounts.isError || balances.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat akun. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : (
            <>
              <PocketCard>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  TOTAL SALDO
                </Text>
                <Text fontFamily="$mono" fontSize="$6" color="$color">
                  {formatRupiah(totalBalance)}
                </Text>
              </PocketCard>

              <PocketCard>
                {(accounts.data ?? []).map((account) => (
                  <XStack
                    key={account.id}
                    justifyContent="space-between"
                    alignItems="center"
                    paddingVertical="$3"
                    borderTopWidth={1}
                    borderTopColor="$borderColor"
                  >
                    <YStack>
                      <Text fontFamily="$body" fontSize="$3" color="$color">
                        {account.name}
                      </Text>
                      <Text fontFamily="$body" fontSize="$1" color="$kulit">
                        {accountTypeLabel(account.type)}
                      </Text>
                    </YStack>
                    <Text fontFamily="$mono" fontSize="$3" color="$color">
                      {formatRupiah(balances.balancesById.get(account.id) ?? 0)}
                    </Text>
                  </XStack>
                ))}
              </PocketCard>
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
