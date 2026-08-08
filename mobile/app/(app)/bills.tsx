import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { SubScreenHeader } from '../../src/components/SubScreenHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { useBills } from '../../src/bills/useBills'
import { nextBillOccurrence } from '../../src/bills/nextBillOccurrence'
import { billUrgency } from '../../src/dashboard/billUrgency'
import { formatRupiah } from '../../src/format/money'

export default function BillsScreen() {
  const bills = useBills()
  const now = new Date()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$3">
          <SubScreenHeader title="Tagihan Berulang" />

          {bills.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : bills.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat tagihan. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : bills.data && bills.data.length > 0 ? (
            <PocketCard>
              {bills.data.map((bill) => {
                const occurrence = nextBillOccurrence(bill.due_day, now)
                const urgency = billUrgency(occurrence.toISOString(), now)
                return (
                  <XStack
                    key={bill.id}
                    justifyContent="space-between"
                    alignItems="center"
                    paddingVertical="$3"
                    borderTopWidth={1}
                    borderTopColor="$borderColor"
                  >
                    <YStack>
                      <Text fontFamily="$body" fontSize="$3" color="$color">
                        {bill.name}
                      </Text>
                      <Text fontFamily="$body" fontSize="$1" color={urgency.color}>
                        {urgency.label}
                      </Text>
                    </YStack>
                    <Text fontFamily="$mono" fontSize="$3" color="$color">
                      {formatRupiah(bill.amount)}
                    </Text>
                  </XStack>
                )
              })}
            </PocketCard>
          ) : (
            <PocketCard tone="muted">
              <Text fontFamily="$body" fontSize="$3" color="$color" textAlign="center">
                Belum ada tagihan berulang
              </Text>
            </PocketCard>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
