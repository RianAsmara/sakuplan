import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, YStack } from 'tamagui'
import { nextBillOccurrence } from '../../src/bills/nextBillOccurrence'
import { useBills } from '../../src/bills/useBills'
import { DetailHeader } from '../../src/components/AppHeader'
import { Amount, Body, LedgerRow, Meta, Screen } from '../../src/components/primitives'
import { billUrgency } from '../../src/dashboard/billUrgency'
import { formatRupiah } from '../../src/format/money'

export default function BillsScreen() {
  const bills = useBills()
  const now = new Date()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <DetailHeader title="Tagihan berulang" />
      <ScrollView flex={1} backgroundColor="$kertas">
        <Screen>
          {bills.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$terjaga" />
            </YStack>
          ) : bills.isError ? (
            <Meta color="$peringatan">Gagal memuat tagihan. Coba lagi nanti.</Meta>
          ) : bills.data && bills.data.length > 0 ? (
            <YStack>
              {bills.data.map((bill) => {
                const occurrence = nextBillOccurrence(bill.due_day, now)
                const urgency = billUrgency(occurrence.toISOString(), now)
                return (
                  <LedgerRow key={bill.id} pv={13}>
                    <YStack flex={1}>
                      <Body>{bill.name}</Body>
                      <Meta color={urgency.color}>{urgency.label}</Meta>
                    </YStack>
                    <Amount size={15}>{formatRupiah(bill.amount)}</Amount>
                  </LedgerRow>
                )
              })}
            </YStack>
          ) : (
            <Meta textAlign="center">Belum ada tagihan berulang</Meta>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
