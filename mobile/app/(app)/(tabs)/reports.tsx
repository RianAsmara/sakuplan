import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons-2'
import { BarChart, LineChart } from 'react-native-gifted-charts'
import { PocketCard } from '../../../src/components/PocketCard'
import { formatRupiah } from '../../../src/format/money'
import { addMonths, endOfMonth, formatMonthYearID, startOfMonth, toDateOnly } from '../../../src/format/date'
import { toBudgetVsActualBarData, toCategoryBarData, toTrendLines } from '../../../src/reports/chartData'
import { useCashFlowReport } from '../../../src/reports/useCashFlowReport'

const COLORS = {
  primary: '#0E6B58',
  accent: '#C9A227',
  danger: '#B23B33',
}

export default function ReportsScreen() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const start = toDateOnly(startOfMonth(month))
  const end = toDateOnly(endOfMonth(month))
  const report = useCashFlowReport({ start, end })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <Text fontFamily="$heading" fontSize="$4" color="$color">
            Laporan
          </Text>

          <XStack alignItems="center" justifyContent="space-between">
            <XStack onPress={() => setMonth((prev) => addMonths(prev, -1))} padding="$2">
              <ChevronLeft size={20} color="$color" />
            </XStack>
            <Text fontFamily="$body" fontSize="$3" color="$color">
              {formatMonthYearID(month)}
            </Text>
            <XStack onPress={() => setMonth((prev) => addMonths(prev, 1))} padding="$2">
              <ChevronRight size={20} color="$color" />
            </XStack>
          </XStack>

          {report.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : report.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat laporan. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : report.data && report.data.income === 0 && report.data.expenses === 0 ? (
            <PocketCard tone="muted">
              <Text fontFamily="$body" fontSize="$2" color="$kulit" textAlign="center">
                Belum ada transaksi di bulan ini.
              </Text>
            </PocketCard>
          ) : report.data ? (
            <>
              <XStack gap="$3">
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    PEMASUKAN
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$primary">
                    {formatRupiah(report.data.income)}
                  </Text>
                </PocketCard>
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    PENGELUARAN
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$danger">
                    {formatRupiah(report.data.expenses)}
                  </Text>
                </PocketCard>
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    ARUS KAS BERSIH
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color={report.data.net_cash_flow >= 0 ? '$primary' : '$danger'}>
                    {formatRupiah(report.data.net_cash_flow)}
                  </Text>
                </PocketCard>
              </XStack>

              <PocketCard>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  TREN ARUS KAS
                </Text>
                {(() => {
                  const { income, expenses } = toTrendLines(report.data.trend)
                  return (
                    <LineChart
                      data={income}
                      data2={expenses}
                      color={COLORS.primary}
                      color2={COLORS.danger}
                      thickness={2}
                      hideRules
                      yAxisTextStyle={{ color: '#7C6A5B', fontSize: 10 }}
                      xAxisLabelTextStyle={{ color: '#7C6A5B', fontSize: 10 }}
                      curved
                      initialSpacing={8}
                      noOfSections={4}
                      height={160}
                    />
                  )
                })()}
                <XStack gap="$4">
                  <XStack alignItems="center" gap="$1">
                    <YStack width={8} height={8} borderRadius={4} backgroundColor="$primary" />
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      Pemasukan
                    </Text>
                  </XStack>
                  <XStack alignItems="center" gap="$1">
                    <YStack width={8} height={8} borderRadius={4} backgroundColor="$danger" />
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      Pengeluaran
                    </Text>
                  </XStack>
                </XStack>
              </PocketCard>

              {report.data.category_breakdown.length > 0 ? (
                <PocketCard>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    PENGELUARAN PER KATEGORI
                  </Text>
                  <BarChart
                    data={toCategoryBarData(report.data.category_breakdown, COLORS.primary)}
                    horizontal
                    barWidth={18}
                    spacing={16}
                    yAxisLabelWidth={90}
                    barBorderRadius={4}
                    height={report.data.category_breakdown.length * 36}
                  />
                </PocketCard>
              ) : null}

              {report.data.budget_vs_actual.length > 0 ? (
                <PocketCard>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    ANGGARAN VS AKTUAL
                  </Text>
                  <BarChart
                    data={toBudgetVsActualBarData(report.data.budget_vs_actual, {
                      budgeted: COLORS.primary,
                      actualOver: COLORS.danger,
                      actualUnder: COLORS.accent,
                    })}
                    barWidth={14}
                    barBorderRadius={3}
                    yAxisTextStyle={{ color: '#7C6A5B', fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: '#7C6A5B', fontSize: 9 }}
                    height={160}
                  />
                  <XStack gap="$4">
                    <XStack alignItems="center" gap="$1">
                      <YStack width={8} height={8} borderRadius={4} backgroundColor="$primary" />
                      <Text fontFamily="$body" fontSize="$1" color="$kulit">
                        Dianggarkan
                      </Text>
                    </XStack>
                    <XStack alignItems="center" gap="$1">
                      <YStack width={8} height={8} borderRadius={4} backgroundColor="$accent" />
                      <Text fontFamily="$body" fontSize="$1" color="$kulit">
                        Aktual (sesuai anggaran)
                      </Text>
                    </XStack>
                    <XStack alignItems="center" gap="$1">
                      <YStack width={8} height={8} borderRadius={4} backgroundColor="$danger" />
                      <Text fontFamily="$body" fontSize="$1" color="$kulit">
                        Aktual (lebih dari anggaran)
                      </Text>
                    </XStack>
                  </XStack>
                </PocketCard>
              ) : null}
            </>
          ) : null}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
