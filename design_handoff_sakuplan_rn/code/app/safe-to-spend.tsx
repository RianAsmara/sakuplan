import { ScrollView, XStack, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DashedBox } from '../components/DashedBox'
import { DetailHeader } from '../components/AppHeader'
import { Amount, Body, BodyS, Meta, MetaS } from '../components/primitives'
import { fmtIDR } from '../lib/format'
import { useApp } from '../store/AppStore'

/**
 * ============================================================================
 * REFERENCE CONVERSION — Rincian aman belanja (detail screen pattern)
 * ============================================================================
 * Shows the two things every detail screen needs:
 *
 *  1. <DetailHeader> sits OUTSIDE the scroll area and outside the 20px gutters, because the
 *     bar bleeds edge-to-edge and owns its own hairline.
 *  2. The tab bar is absent — this route lives outside app/(tabs)/, which is what hides it.
 *
 * The screen itself is an audit trail. Its whole job is to make the big number on Home
 * believable, so every line of the arithmetic is shown in the order it is computed.
 */
export default function SafeToSpendScreen() {
  const { derived } = useApp()
  const insets = useSafeAreaInsets()

  return (
    <YStack flex={1} backgroundColor="$kertas" paddingTop={insets.top}>
      <DetailHeader title="Rincian aman belanja" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 }}
      >
        <DashedBox
          color="#006B5E"
          fill="rgba(0,107,94,0.06)"
          radius={8}
          style={{ padding: 18, marginBottom: 16 }}
        >
          <Meta fontSize={12} marginBottom={6}>
            AMAN DIBELANJAKAN HARI INI
          </Meta>
          <Amount size={36} color="$terjaga">
            {fmtIDR(derived.safeToday)}
          </Amount>
          <Meta fontSize={12} marginTop={6}>
            {fmtIDR(derived.safeUntilPayday)} ÷ {derived.days} hari sampai gajian
          </Meta>
        </DashedBox>

        <MetaS marginBottom={8}>RINCIAN PERHITUNGAN</MetaS>

        <DashedBox color="#AEB9B2" fill="#FFFFFF" radius={8} style={{ padding: 16 }}>
          <BreakdownRow label="Saldo cair (tunai, bank, e-wallet)" value={derived.liquid} />
          <BreakdownRow label="− Tagihan belum lunas" value={derived.unpaidBills} danger />
          <BreakdownRow label="− Sisa anggaran bulan ini" value={derived.remainingBudget} danger />
          {/*
            NOTE: the safety buffer (derived.safetyBuffer) IS subtracted in the maths but is
            not shown as a row here — that matches the prototype exactly. It is flagged as an
            open question in SCREENS.md; ask before adding a row for it.
          */}
          <XStack justifyContent="space-between" paddingVertical={10}>
            <BodyS fontWeight="500">= Aman sampai gajian</BodyS>
            <Amount size={14} color="$terjaga">
              {fmtIDR(derived.safeUntilPayday)}
            </Amount>
          </XStack>
        </DashedBox>
      </ScrollView>
    </YStack>
  )
}

/**
 * A dashed rule separates the inputs — solid rules are reserved for list dividers.
 * `borderStyle: 'dashed'` is safe HERE because there is no borderRadius involved; it is the
 * radius + dash combination that breaks on Android. Anything with rounded corners must use
 * <DashedBox>.
 */
function BreakdownRow({
  label,
  value,
  danger = false,
}: {
  label: string
  value: number
  danger?: boolean
}) {
  return (
    <XStack
      justifyContent="space-between"
      paddingVertical={8}
      borderBottomWidth={1}
      borderBottomColor="$tekan"
      borderStyle="dashed"
    >
      <BodyS color={danger ? '$peringatan' : '$tinta'} flex={1} paddingRight={12}>
        {label}
      </BodyS>
      <Amount size={13} color={danger ? '$peringatan' : '$tinta'}>
        {fmtIDR(value)}
      </Amount>
    </XStack>
  )
}
