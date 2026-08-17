import { router } from 'expo-router'
import { ScrollView, Text, View, XStack, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DashedBox } from '../../components/DashedBox'
import { ProgressBar } from '../../components/ProgressBar'
import {
  Amount,
  Body,
  Meta,
  MetaS,
  SectionHeading,
  Wordmark,
} from '../../components/primitives'
import { fmtIDR } from '../../lib/format'
import * as F from '../../lib/finance'
import { useApp } from '../../store/AppStore'

/**
 * ============================================================================
 * REFERENCE CONVERSION — Beranda (Home)
 * ============================================================================
 * This is the pattern to follow for the other 12 screens. What it demonstrates:
 *
 *  1. Read data from `useApp()`; derive nothing in the component that lib/finance.ts
 *     can derive for you.
 *  2. Selectors return semantic status; the SCREEN maps status to color. Search for
 *     `over` / `negative` below to see it.
 *  3. Cards use <DashedBox>, never borderStyle: 'dashed'.
 *  4. Lists use borderTopWidth for dividers, matching the HTML's ledger look.
 *  5. Every group is a flex container with `gap`. No margin-based spacing between siblings.
 *  6. Text is a typed primitive (Body / Meta / Amount), never a raw <Text> with a size.
 *
 * Spacing note: sibling sections keep the design's explicit 20px bottom margins rather
 * than one uniform gap, because the design's rhythm is deliberately uneven (18 / 20 / 22).
 */
export default function HomeScreen() {
  const { state, today, derived, actions } = useApp()
  const insets = useSafeAreaInsets()

  const unread = F.unreadCount(state)
  const attention = F.attentionItems(state, today)
  const goal = F.topGoal(state)
  const goalPct = goal ? Math.min(100, Math.round((goal.contributed / goal.target) * 100)) : 0
  const topCats = F.topCategories(state)
  const totals = F.budgetTotals(state)
  const showAi = F.hasAi(state)
  const initial = (state.userName || '?').trim().charAt(0).toUpperCase() || '?'

  /**
   * The one piece of conditional design that carries real weight: a negative daily
   * allowance is NOT shown as a minus number. It is reframed as an exceeded limit, in
   * peringatan rather than terjaga, and the figure is the absolute value.
   */
  const negative = derived.safeToday < 0
  const sts = {
    label: negative ? 'Batas harian terlampaui' : 'Aman dibelanjakan hari ini',
    labelColor: negative ? '$peringatan' : '$kulit',
    amountColor: negative ? '$peringatan' : '$terjaga',
    borderColor: negative ? '#C3443D' : '#66736C',
    fill: negative ? 'rgba(195,68,61,0.04)' : '#FFFFFF',
    supporting: negative
      ? `Di atas batas aman · ${derived.days} hari menuju gajian`
      : `Aman hingga gajian: ${fmtIDR(derived.safeUntilPayday)} · ${derived.days} hari menuju gajian`,
  }

  return (
    <ScrollView
      backgroundColor="$kertas"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 20,
        paddingBottom: 28,
      }}
    >
      {/* --- Brand row. Beranda has no TabHeader; this replaces it. --- */}
      <XStack alignItems="center" justifyContent="space-between" marginBottom={18}>
        <Wordmark size="s">SakuPlan</Wordmark>
        <XStack alignItems="center" gap={12}>
          <XStack
            alignItems="center"
            paddingVertical={4}
            pressStyle={{ scale: 0.95 }}
            animation="quick"
            hitSlop={{ top: 10, bottom: 10 }}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
          >
            <Body fontSize={13}>Notifikasi</Body>
            {unread > 0 ? (
              <View
                width={6}
                height={6}
                borderRadius={999}
                backgroundColor="$peringatan"
                marginLeft={5}
              />
            ) : null}
          </XStack>

          {/* 30px circle inside a 44px touch target. */}
          <XStack
            width={44}
            height={44}
            alignItems="center"
            justifyContent="center"
            pressStyle={{ scale: 0.9 }}
            animation="quick"
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Profil & preferensi"
          >
            <XStack
              width={30}
              height={30}
              borderRadius={999}
              borderWidth={1.5}
              borderColor="$terjaga"
              backgroundColor="$putih"
              alignItems="center"
              justifyContent="center"
            >
              <Amount size={13} fontSize={12} color="$terjaga">
                {initial}
              </Amount>
            </XStack>
          </XStack>
        </XStack>
      </XStack>

      <Meta fontSize={13} marginBottom={18}>
        Halo, {state.userName}. Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari
        ini.
      </Meta>

      {/* --- Safe-to-spend hero --- */}
      <DashedBox
        color={sts.borderColor}
        fill={sts.fill}
        radius={8}
        style={{ padding: 20, marginBottom: 20 }}
      >
        <YStack
          pressStyle={{ scale: 0.98 }}
          animation="quick"
          onPress={() => router.push('/safe-to-spend')}
          accessibilityRole="button"
        >
          <Text
            fontFamily="$body"
            fontWeight="500"
            fontSize={12}
            lineHeight={17}
            letterSpacing={0.24}
            color={sts.labelColor}
            marginBottom={6}
          >
            {sts.label}
          </Text>
          <Amount size={42} color={sts.amountColor}>
            {fmtIDR(Math.abs(derived.safeToday))}
          </Amount>
          <Meta fontSize={13} marginTop={8}>
            {sts.supporting} ›
          </Meta>
        </YStack>
      </DashedBox>

      {/* --- Flat two-column summary. No card: a 1px rule does the dividing. --- */}
      <XStack marginBottom={20}>
        <YStack flex={1}>
          <Meta fontSize={12} marginBottom={6}>
            Saldo tersedia
          </Meta>
          <Amount size={17}>{fmtIDR(derived.liquid)}</Amount>
        </YStack>
        <View width={1} backgroundColor="$hairline" marginHorizontal={16} alignSelf="stretch" />
        <YStack flex={1}>
          <Meta fontSize={12} marginBottom={6}>
            Pengeluaran bulan ini
          </Meta>
          <Amount size={17}>{fmtIDR(totals.spent)}</Amount>
        </YStack>
      </XStack>

      {/* --- Perlu perhatian: overdue bills and blown budgets in ONE list --- */}
      {attention.length > 0 ? (
        <YStack marginBottom={20}>
          <SectionHeading marginBottom={10}>Perlu perhatian</SectionHeading>
          <YStack borderRadius={8} backgroundColor="rgba(195,68,61,0.06)" overflow="hidden">
            {attention.map((a) => (
              <XStack
                key={a.key}
                justifyContent="space-between"
                alignItems="center"
                paddingVertical={13}
                paddingHorizontal={14}
                borderTopWidth={1}
                borderTopColor="rgba(195,68,61,0.12)"
              >
                <YStack flex={1} paddingRight={12}>
                  <Body>{a.title}</Body>
                  <Meta fontSize={12} color="$peringatan" marginTop={2}>
                    {a.detail}
                  </Meta>
                </YStack>
                <YStack alignItems="flex-end" gap={6}>
                  <Amount size={15}>{fmtIDR(a.amount)}</Amount>
                  <Text
                    fontFamily="$body"
                    fontWeight="500"
                    fontSize={12}
                    lineHeight={16}
                    color="$peringatan"
                    paddingVertical={2}
                    pressStyle={{ opacity: 0.7 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => {
                      if (a.kind === 'bill') actions.markBillPaid(a.refId)
                      else router.push('/(tabs)/budgets')
                    }}
                    accessibilityRole="button"
                  >
                    {a.actionLabel}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </YStack>
      ) : null}

      {/* --- Top savings goal. Amber, with the dashed tick on the bar. --- */}
      {goal ? (
        <DashedBox
          color="#AEB9B2"
          fill="#FFFFFF"
          radius={8}
          style={{ padding: 14, marginBottom: 20 }}
        >
          <YStack
            pressStyle={{ scale: 0.98 }}
            animation="quick"
            onPress={() => router.push('/goals')}
            accessibilityRole="button"
          >
            <XStack justifyContent="space-between" marginBottom={8}>
              <MetaS>{goal.name}</MetaS>
              <Amount size={13} color="$leluasa">
                {goalPct}%
              </Amount>
            </XStack>
            <ProgressBar pct={goalPct} height={6} fill="$leluasa" tick />
            <Meta fontSize={12} marginTop={6}>
              {fmtIDR(goal.contributed)} dari {fmtIDR(goal.target)}
            </Meta>
          </YStack>
        </DashedBox>
      ) : null}

      {/* --- Biggest categories. Plain ledger, no bars, no card. --- */}
      <YStack marginBottom={20}>
        <SectionHeading marginBottom={10}>Pengeluaran terbesar bulan ini</SectionHeading>
        {topCats.map((c) => (
          <XStack
            key={c.id}
            justifyContent="space-between"
            paddingVertical={9}
            borderTopWidth={1}
            borderTopColor="$hairline"
          >
            <Body>{c.name}</Body>
            <Amount size={14}>{fmtIDR(c.spent)}</Amount>
          </XStack>
        ))}
      </YStack>

      {/* --- AI banner. Amber, and only with consent + pending suggestions. --- */}
      {showAi ? (
        <DashedBox
          color="#D2A21B"
          fill="rgba(210,162,27,0.05)"
          radius={8}
          style={{ paddingVertical: 12, paddingHorizontal: 14 }}
        >
          <YStack
            pressStyle={{ scale: 0.98 }}
            animation="quick"
            onPress={() => router.push('/ai-review')}
            accessibilityRole="button"
          >
            <Text
              fontFamily="$body"
              fontWeight="400"
              fontSize={10}
              lineHeight={14}
              letterSpacing={0.4}
              color="$leluasa"
              marginBottom={3}
            >
              SARAN AI · MENUNGGU PERSETUJUAN
            </Text>
            <Meta fontSize={13}>
              {state.aiSuggestions.length} rekomendasi anggaran ·{' '}
              <Text fontFamily="$body" fontWeight="500" fontSize={13} color="$tinta">
                Tinjau rekomendasi ›
              </Text>
            </Meta>
          </YStack>
        </DashedBox>
      ) : null}
    </ScrollView>
  )
}
