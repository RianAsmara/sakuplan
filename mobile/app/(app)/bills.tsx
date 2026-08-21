import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, YStack } from 'tamagui'
import { isPaidForPeriod } from '../../src/bills/billPaymentStatus'
import { currentBillPeriodDueDate } from '../../src/bills/nextBillOccurrence'
import { useBills } from '../../src/bills/useBills'
import { useMarkBillPaid } from '../../src/bills/useMarkBillPaid'
import { DetailHeader } from '../../src/components/AppHeader'
import { Amount, Body, InlineAction, LedgerRow, Meta, Screen } from '../../src/components/primitives'
import { billUrgency } from '../../src/dashboard/billUrgency'
import { formatDateID, toRFC3339 } from '../../src/format/date'
import { formatRupiah } from '../../src/format/money'
import type { components } from '../../src/api/client'

type Bill = components['schemas']['Bill']

function BillRow({ bill, now }: { bill: Bill; now: Date }) {
  const markPaid = useMarkBillPaid()
  const periodDue = currentBillPeriodDueDate(bill.due_day, now)
  const paid = isPaidForPeriod(bill, periodDue)
  const isPending = markPaid.isPending && markPaid.variables?.billId === bill.id

  const urgency = billUrgency(periodDue.toISOString(), now)
  const label = paid ? `Lunas · ${formatDateID(periodDue.toISOString())}` : urgency.label
  const color = paid ? '$terjaga' : urgency.color

  return (
    <LedgerRow pv={13}>
      <YStack flex={1}>
        <Body>{bill.name}</Body>
        <Meta color={color}>{label}</Meta>
      </YStack>
      <YStack alignItems="flex-end" gap="$1.5">
        <Amount size={15}>{formatRupiah(bill.amount)}</Amount>
        {!paid ? (
          <InlineAction
            opacity={isPending ? 0.5 : 1}
            onPress={() =>
              markPaid.mutate({ billId: bill.id, dueDate: toRFC3339(periodDue) })
            }
          >
            {isPending ? 'Menandai...' : 'Tandai lunas'}
          </InlineAction>
        ) : null}
      </YStack>
    </LedgerRow>
  )
}

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
              {bills.data.map((bill) => (
                <BillRow key={bill.id} bill={bill} now={now} />
              ))}
            </YStack>
          ) : (
            <Meta textAlign="center">Belum ada tagihan berulang</Meta>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
