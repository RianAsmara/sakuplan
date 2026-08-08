import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { SubScreenHeader } from '../../src/components/SubScreenHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { useSafeToSpend } from '../../src/budgets/useSafeToSpend'
import { formatRupiah } from '../../src/format/money'

function BreakdownRow({
  label,
  amount,
  emphasis,
}: {
  label: string
  amount: string
  emphasis?: boolean
}) {
  return (
    <XStack
      justifyContent="space-between"
      paddingVertical="$3"
      borderTopWidth={1}
      borderTopColor="$borderColor"
    >
      <Text fontFamily="$body" fontSize="$2" color={emphasis ? '$color' : '$kulit'}>
        {label}
      </Text>
      <Text
        fontFamily="$mono"
        fontSize="$3"
        color={emphasis ? '$primary' : '$color'}
      >
        {amount}
      </Text>
    </XStack>
  )
}

export default function SafeToSpendScreen() {
  const safeToSpend = useSafeToSpend()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$3">
          <SubScreenHeader title="Aman Dibelanjakan" />

          {safeToSpend.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : safeToSpend.isError || !safeToSpend.data ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat rincian. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : (
            <>
              <PocketCard elevated>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  AMAN DIBELANJAKAN HARI INI
                </Text>
                <Text fontFamily="$mono" fontSize="$6" color="$primary">
                  {formatRupiah(safeToSpend.data.daily)}
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  {`${formatRupiah(safeToSpend.data.until_payday)} · ${safeToSpend.data.days_remaining} hari sampai gajian`}
                </Text>
              </PocketCard>

              <Text fontFamily="$body" fontSize="$1" color="$kulit">
                RINCIAN PERHITUNGAN
              </Text>
              <PocketCard>
                <BreakdownRow
                  label="Saldo cair"
                  amount={formatRupiah(safeToSpend.data.liquid_balance)}
                />
                <BreakdownRow
                  label="− Tagihan belum lunas"
                  amount={formatRupiah(safeToSpend.data.upcoming_bills)}
                />
                <BreakdownRow
                  label="− Sisa komitmen tabungan"
                  amount={formatRupiah(safeToSpend.data.remaining_savings_commitment)}
                />
                <BreakdownRow
                  label="− Dana darurat minimum"
                  amount={formatRupiah(safeToSpend.data.minimum_buffer)}
                />
                <BreakdownRow
                  label="= Aman sampai gajian"
                  amount={formatRupiah(safeToSpend.data.until_payday)}
                  emphasis
                />
              </PocketCard>
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
