import { useMemo } from 'react'
import { useRouter } from 'expo-router'
import { Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, XStack, YStack, View } from 'tamagui'
import { useCurrentUser } from '../../../src/auth/useCurrentUser'
import { isPaidForPeriod } from '../../../src/bills/billPaymentStatus'
import { currentBillPeriodDueDate } from '../../../src/bills/nextBillOccurrence'
import { useBills } from '../../../src/bills/useBills'
import { useMarkBillPaid } from '../../../src/bills/useMarkBillPaid'
import { useActiveBudget } from '../../../src/budgets/useActiveBudget'
import { DashedBox } from '../../../src/components/DashedBox'
import { PocketCard } from '../../../src/components/PocketCard'
import { ProgressBar } from '../../../src/components/ProgressBar'
import {
  Amount,
  Body,
  BodyS,
  InlineAction,
  LedgerRow,
  Meta,
  MetaS,
  Screen,
  SectionHeading,
  Wordmark,
} from '../../../src/components/primitives'
import { useDashboard } from '../../../src/dashboard/useDashboard'
import { endOfMonth, startOfMonth, toRFC3339 } from '../../../src/format/date'
import { formatRupiah } from '../../../src/format/money'
import { useCashFlowReport } from '../../../src/reports/useCashFlowReport'

type AttentionItem = {
  key: string
  title: string
  detail: string
  amount: number
  action?: string
  onAction?: () => void
}

export default function HomeScreen() {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const dashboard = useDashboard()
  const bills = useBills()
  const activeBudget = useActiveBudget()
  const now = new Date()
  const periodStart = activeBudget.data?.start_date ?? toRFC3339(startOfMonth(now))
  const periodEnd = activeBudget.data?.end_date ?? toRFC3339(endOfMonth(now))
  const cashFlow = useCashFlowReport({ start: periodStart, end: periodEnd })

  const userInitial = user?.display_name?.trim()?.[0]?.toUpperCase() ?? '?'
  const markBillPaid = useMarkBillPaid()

  // No single endpoint returns "everything needing attention" — combined
  // here from bills (overdue/due-today, via currentBillPeriodDueDate + the
  // real last_paid_due_date field) and the cash-flow report's
  // budget_vs_actual (over-budget), the same real sources bills.tsx and
  // budgets.tsx already use.
  const attentionItems: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = []
    for (const bill of bills.data ?? []) {
      const periodDue = currentBillPeriodDueDate(bill.due_day, now)
      if (isPaidForPeriod(bill, periodDue)) continue
      const days = Math.round((periodDue.getTime() - now.getTime()) / 86_400_000)
      if (days > 0) continue
      items.push({
        key: `bill-${bill.id}`,
        title: bill.name,
        detail: days < 0 ? `Terlambat ${Math.abs(days)} hari` : 'Jatuh tempo hari ini',
        amount: bill.amount,
        action: 'Tandai dibayar',
        onAction: () => markBillPaid.mutate({ billId: bill.id, dueDate: toRFC3339(periodDue) }),
      })
    }
    for (const line of cashFlow.data?.budget_vs_actual ?? []) {
      if (line.actual <= line.budgeted) continue
      const overage = line.actual - line.budgeted
      items.push({
        key: `budget-${line.category_id}`,
        title: `Anggaran ${line.name} terlampaui`,
        detail: `Melebihi anggaran ${formatRupiah(overage)} · terpakai ${formatRupiah(line.actual)} dari ${formatRupiah(line.budgeted)}`,
        amount: overage,
        action: 'Lihat anggaran',
        onAction: () => router.push('/(app)/(tabs)/budgets'),
      })
    }
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now`/`router` are stable per render, not reactive inputs
  }, [bills.data, cashFlow.data])

  const topGoal = useMemo(() => {
    const goals = dashboard.data?.goals ?? []
    if (goals.length === 0) return null
    return [...goals].sort((a, b) => b.progress_percent - a.progress_percent)[0]
  }, [dashboard.data])

  const topCategories = useMemo(
    () => [...(dashboard.data?.top_categories ?? [])].sort((a, b) => b.amount - a.amount).slice(0, 3),
    [dashboard.data],
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$kertas">
        <Screen>
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$4.5">
            <Wordmark size="s">SakuPlan</Wordmark>
            <Pressable
              onPress={() => router.push('/(app)/profile')}
              hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
            >
              <View
                width={30}
                height={30}
                borderRadius={15}
                borderWidth={1.5}
                borderColor="$terjaga"
                backgroundColor="$putih"
                alignItems="center"
                justifyContent="center"
              >
                <Amount size={12}>{userInitial}</Amount>
              </View>
            </Pressable>
          </XStack>

          {dashboard.isLoading || !dashboard.data ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$terjaga" />
            </YStack>
          ) : dashboard.isError ? (
            <Meta color="$peringatan">Gagal memuat ringkasan. Coba lagi nanti.</Meta>
          ) : (
            <>
              <BodyS color="$kulit" marginBottom="$4.5">
                {`Halo, ${user?.display_name ?? ''}. Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari ini.`}
              </BodyS>

              <Pressable onPress={() => router.push('/(app)/safe-to-spend')}>
                <SafeToSpendCard
                  safeToday={dashboard.data.safe_to_spend_today}
                  safeUntilPayday={dashboard.data.safe_to_spend_until_payday}
                  daysUntilPayday={dashboard.data.days_until_payday}
                />
              </Pressable>

              <XStack marginTop="$5" marginBottom="$5">
                <YStack flex={1}>
                  <Meta marginBottom="$1.5">Saldo tersedia</Meta>
                  <Amount size={17}>{formatRupiah(dashboard.data.liquid_balance)}</Amount>
                </YStack>
                <View width={1} backgroundColor="$hairline" marginHorizontal="$4" />
                <YStack flex={1}>
                  <Meta marginBottom="$1.5">Pengeluaran bulan ini</Meta>
                  <Amount size={17}>{formatRupiah(dashboard.data.budget_used)}</Amount>
                </YStack>
              </XStack>

              {attentionItems.length > 0 ? (
                <YStack marginBottom="$5">
                  <SectionHeading marginBottom="$2">Perlu perhatian</SectionHeading>
                  <YStack borderRadius={8} overflow="hidden" backgroundColor="$peringatanFill">
                    {attentionItems.map((item, index) => (
                      <XStack
                        key={item.key}
                        justifyContent="space-between"
                        paddingVertical={13}
                        paddingHorizontal={14}
                        borderTopWidth={index === 0 ? 0 : 1}
                        borderTopColor="$peringatanRule"
                      >
                        <YStack flex={1} paddingRight="$2">
                          <Body>{item.title}</Body>
                          <Meta color="$peringatan" marginTop="$0.5">
                            {item.detail}
                          </Meta>
                        </YStack>
                        <YStack alignItems="flex-end" gap="$1.5">
                          <Amount size={15}>{formatRupiah(item.amount)}</Amount>
                          {item.action ? (
                            <InlineAction color="$peringatan" onPress={item.onAction}>
                              {item.action}
                            </InlineAction>
                          ) : null}
                        </YStack>
                      </XStack>
                    ))}
                  </YStack>
                </YStack>
              ) : null}

              {topGoal ? (
                <PocketCard
                  padding="$3.5"
                  marginBottom="$5"
                  onPress={() => router.push('/(app)/goals')}
                >
                  <XStack justifyContent="space-between">
                    <MetaS>{topGoal.name}</MetaS>
                    <Amount size={13} color="$leluasa">{`${Math.min(topGoal.progress_percent, 100)}%`}</Amount>
                  </XStack>
                  <ProgressBar
                    pct={Math.min(topGoal.progress_percent, 100)}
                    height={6}
                    fill="$leluasa"
                    tick
                  />
                  <Meta>
                    {`${formatRupiah(topGoal.contributed)} dari ${formatRupiah(topGoal.target_amount)}`}
                  </Meta>
                </PocketCard>
              ) : null}

              {topCategories.length > 0 ? (
                <YStack>
                  <SectionHeading marginBottom="$2">Pengeluaran terbesar bulan ini</SectionHeading>
                  {topCategories.map((category) => (
                    <LedgerRow key={category.category_id} pv={9}>
                      <Body>{category.name}</Body>
                      <Amount size={14}>{formatRupiah(category.amount)}</Amount>
                    </LedgerRow>
                  ))}
                </YStack>
              ) : null}

              {/* AI banner omitted — no AI backend exists yet. */}
            </>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}

function SafeToSpendCard({
  safeToday,
  safeUntilPayday,
  daysUntilPayday,
}: {
  safeToday: number
  safeUntilPayday: number
  daysUntilPayday: number
}) {
  const negative = safeToday < 0
  return (
    <DashedBox
      color={negative ? '#C3443D' : '#66736C'}
      fill={negative ? 'rgba(195,68,61,0.04)' : '#FFFFFF'}
      radius={8}
      style={{ padding: 20 }}
    >
      <Meta fontWeight="500" color={negative ? '$peringatan' : '$kulit'}>
        {negative ? 'Batas harian terlampaui' : 'Aman dibelanjakan hari ini'}
      </Meta>
      <Amount size={42} color={negative ? '$peringatan' : '$terjaga'}>
        {formatRupiah(Math.abs(safeToday))}
      </Amount>
      <Meta marginTop="$2">
        {negative
          ? `Di atas batas aman · ${daysUntilPayday} hari menuju gajian ›`
          : `Aman hingga gajian: ${formatRupiah(safeUntilPayday)} · ${daysUntilPayday} hari menuju gajian ›`}
      </Meta>
    </DashedBox>
  )
}
