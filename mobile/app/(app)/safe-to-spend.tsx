import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, XStack, YStack } from 'tamagui'
import { useSafeToSpend } from '../../src/budgets/useSafeToSpend'
import { DetailHeader } from '../../src/components/AppHeader'
import { DashedBox, DashedRule } from '../../src/components/DashedBox'
import { PocketCard } from '../../src/components/PocketCard'
import { Amount, Body, Meta, Screen } from '../../src/components/primitives'
import { formatRupiah } from '../../src/format/money'

const TEKAN = '#EEF3EF'

function BreakdownRow({
  label,
  amount,
  tone,
  emphasis,
  showRule,
}: {
  label: string
  amount: string
  tone: 'tinta' | 'peringatan' | 'terjaga'
  emphasis?: boolean
  showRule?: boolean
}) {
  const color = tone === 'peringatan' ? '$peringatan' : tone === 'terjaga' ? '$terjaga' : '$tinta'
  return (
    <YStack>
      <XStack justifyContent="space-between" paddingVertical={emphasis ? 10 : 8}>
        <Body color={color} fontWeight={emphasis ? '500' : '400'}>
          {label}
        </Body>
        <Amount size={14} color={color}>
          {amount}
        </Amount>
      </XStack>
      {showRule ? <DashedRule color={TEKAN} /> : null}
    </YStack>
  )
}

export default function SafeToSpendScreen() {
  const safeToSpend = useSafeToSpend()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <DetailHeader title="Rincian aman belanja" />
      <ScrollView flex={1} backgroundColor="$kertas">
        <Screen>
          {safeToSpend.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$terjaga" />
            </YStack>
          ) : safeToSpend.isError || !safeToSpend.data ? (
            <Meta color="$peringatan">Gagal memuat rincian. Coba lagi nanti.</Meta>
          ) : (
            <>
              <DashedBox color="#006B5E" fill="rgba(0,107,94,0.06)" radius={8} style={{ padding: 18 }}>
                <Meta>AMAN DIBELANJAKAN HARI INI</Meta>
                <Amount size={36} color="$terjaga">
                  {formatRupiah(safeToSpend.data.daily)}
                </Amount>
                <Meta>
                  {`${formatRupiah(safeToSpend.data.until_payday)} ÷ ${safeToSpend.data.days_remaining} hari sampai gajian`}
                </Meta>
              </DashedBox>

              <Meta marginTop="$5" marginBottom="$2">
                RINCIAN PERHITUNGAN
              </Meta>
              <PocketCard gap="$0">
                <BreakdownRow
                  label="Saldo cair (tunai, bank, e-wallet)"
                  amount={formatRupiah(safeToSpend.data.liquid_balance)}
                  tone="tinta"
                  showRule
                />
                <BreakdownRow
                  label="− Tagihan belum lunas"
                  amount={formatRupiah(safeToSpend.data.upcoming_bills)}
                  tone="peringatan"
                  showRule
                />
                <BreakdownRow
                  label="− Sisa anggaran bulan ini"
                  amount={formatRupiah(
                    safeToSpend.data.remaining_savings_commitment + safeToSpend.data.minimum_buffer,
                  )}
                  tone="peringatan"
                  showRule
                />
                <BreakdownRow
                  label="= Aman sampai gajian"
                  amount={formatRupiah(safeToSpend.data.until_payday)}
                  tone="terjaga"
                  emphasis
                />
              </PocketCard>
            </>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
