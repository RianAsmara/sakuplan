import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, XStack, YStack, View } from 'tamagui'
import { TabHeader } from '../../../src/components/AppHeader'
import { PocketCard } from '../../../src/components/PocketCard'
import { ProgressBar } from '../../../src/components/ProgressBar'
import { Amount, Body, Meta, MetaS, Screen, SectionHeading } from '../../../src/components/primitives'
import {
  addMonths,
  endOfMonth,
  formatMonthLongID,
  formatMonthShortID,
  startOfMonth,
  toRFC3339,
} from '../../../src/format/date'
import { formatRupiah } from '../../../src/format/money'
import { CashFlowChart } from '../../../src/reports/CashFlowChart'
import { useCashFlowReport } from '../../../src/reports/useCashFlowReport'

const now = new Date()
// "6 bulan terakhir" — a fixed trailing window ending at the current month,
// not a navigable month picker (the design has no navigation arrows).
const MONTH_OFFSETS = [5, 4, 3, 2, 1, 0]
const MONTH_RANGES = MONTH_OFFSETS.map((offset) => {
  const monthDate = addMonths(startOfMonth(now), -offset)
  return {
    start: toRFC3339(monthDate),
    end: toRFC3339(endOfMonth(monthDate)),
    label: formatMonthShortID(monthDate),
  }
})

export default function ReportsScreen() {
  // No group_by:'month' on the API — six separate range-scoped calls to the
  // same real endpoint Anggaran already uses, one per month, rather than
  // fabricating monthly aggregates client-side.
  const q0 = useCashFlowReport(MONTH_RANGES[0])
  const q1 = useCashFlowReport(MONTH_RANGES[1])
  const q2 = useCashFlowReport(MONTH_RANGES[2])
  const q3 = useCashFlowReport(MONTH_RANGES[3])
  const q4 = useCashFlowReport(MONTH_RANGES[4])
  const q5 = useCashFlowReport(MONTH_RANGES[5])
  const queries = [q0, q1, q2, q3, q4, q5]

  const isLoading = queries.some((q) => q.isLoading)
  const isError = queries.some((q) => q.isError)
  const current = q5.data

  const income = queries.map((q) => q.data?.income ?? 0)
  const expenses = queries.map((q) => q.data?.expenses ?? 0)
  const months = MONTH_RANGES.map((range) => range.label)

  const categories = current?.category_breakdown ?? []
  const maxCategoryAmount = Math.max(1, ...categories.map((category) => category.amount))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$kertas">
        <Screen>
          <TabHeader title="Laporan" description="Ringkasan kondisi keuanganmu" />

          {isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$terjaga" />
            </YStack>
          ) : isError ? (
            <Meta color="$peringatan">Gagal memuat laporan. Coba lagi nanti.</Meta>
          ) : current && current.income === 0 && current.expenses === 0 ? (
            <Meta textAlign="center">Belum ada transaksi bulan ini.</Meta>
          ) : (
            <>
              <PocketCard marginBottom="$6" gap="$3">
                <XStack justifyContent="space-between" alignItems="center">
                  <SectionHeading>Arus kas 6 bulan terakhir</SectionHeading>
                  <Meta>{`${formatMonthLongID(now)} (bulan berjalan)`}</Meta>
                </XStack>

                <CashFlowChart months={months} income={income} expenses={expenses} />

                <XStack gap="$4">
                  <XStack alignItems="center" gap="$1.5">
                    <View width={14} height={2} backgroundColor="$terjaga" />
                    <MetaS>Pemasukan</MetaS>
                  </XStack>
                  <XStack alignItems="center" gap="$1.5">
                    <View width={14} height={2} backgroundColor="$peringatan" />
                    <MetaS>Pengeluaran</MetaS>
                  </XStack>
                </XStack>

                <XStack
                  justifyContent="space-between"
                  borderTopWidth={1}
                  borderTopColor="$kertas"
                  paddingTop="$3"
                >
                  <YStack>
                    <Meta marginBottom="$1">Pemasukan</Meta>
                    <Amount size={14}>{formatRupiah(current?.income ?? 0)}</Amount>
                  </YStack>
                  <YStack>
                    <Meta marginBottom="$1">Pengeluaran</Meta>
                    <Amount size={14}>{formatRupiah(current?.expenses ?? 0)}</Amount>
                  </YStack>
                  <YStack>
                    <Meta marginBottom="$1">Arus kas bersih</Meta>
                    <Amount
                      size={14}
                      color={(current?.net_cash_flow ?? 0) >= 0 ? '$terjaga' : '$peringatan'}
                    >
                      {formatRupiah(current?.net_cash_flow ?? 0)}
                    </Amount>
                  </YStack>
                </XStack>
              </PocketCard>

              {categories.length > 0 ? (
                <YStack>
                  <SectionHeading marginBottom="$2">Pengeluaran per kategori</SectionHeading>
                  {categories.map((category) => (
                    <YStack
                      key={category.category_id}
                      paddingVertical={10}
                      borderTopWidth={1}
                      borderTopColor="$hairline"
                      gap="$1.5"
                    >
                      <XStack justifyContent="space-between">
                        <Body>{category.name}</Body>
                        <Amount size={14}>{formatRupiah(category.amount)}</Amount>
                      </XStack>
                      <ProgressBar
                        pct={(category.amount / maxCategoryAmount) * 100}
                        height={6}
                        fill="$terjaga"
                      />
                    </YStack>
                  ))}
                </YStack>
              ) : null}
            </>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
