import { useMemo } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { PocketCard } from '../../../src/components/PocketCard'
import { formatDateID } from '../../../src/format/date'
import { formatRupiah } from '../../../src/format/money'
import { useActiveBudget } from '../../../src/budgets/useActiveBudget'
import { useSafeToSpend } from '../../../src/budgets/useSafeToSpend'
import { riskLevelMeta } from '../../../src/budgets/riskLevel'
import { useCategories } from '../../../src/categories/useCategories'

export default function BudgetsScreen() {
  const activeBudget = useActiveBudget()
  const safeToSpend = useSafeToSpend()
  const allCategories = useCategories()
  const categoriesById = useMemo(
    () => new Map((allCategories.data ?? []).map((category) => [category.id, category])),
    [allCategories.data]
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <Text fontFamily="$heading" fontSize="$4" color="$color">
            Anggaran
          </Text>

          {activeBudget.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : activeBudget.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat anggaran. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : activeBudget.data ? (
            <>
              <PocketCard>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  PERIODE ANGGARAN AKTIF
                </Text>
                <Text fontFamily="$body" fontSize="$3" color="$color">
                  {`${formatDateID(activeBudget.data.start_date)} – ${formatDateID(activeBudget.data.end_date)}`}
                </Text>
              </PocketCard>

              <XStack gap="$3">
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    PEMASUKAN DIHARAPKAN
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$color">
                    {formatRupiah(activeBudget.data.expected_income)}
                  </Text>
                </PocketCard>
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    KOMITMEN TABUNGAN
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$color">
                    {formatRupiah(activeBudget.data.savings_commitment)}
                  </Text>
                </PocketCard>
              </XStack>

              {safeToSpend.data ? (
                <PocketCard>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      AMAN DIBELANJAKAN PER HARI
                    </Text>
                    <Text fontFamily="$body" fontSize="$1" color={riskLevelMeta(safeToSpend.data.risk_level).color}>
                      {riskLevelMeta(safeToSpend.data.risk_level).label.toUpperCase()}
                    </Text>
                  </XStack>
                  <Text fontFamily="$mono" fontSize="$5" color="$primary">
                    {formatRupiah(safeToSpend.data.daily)}
                  </Text>
                  <Text fontFamily="$body" fontSize="$2" color="$kulit">
                    {`${safeToSpend.data.days_remaining} hari lagi sampai gajian · Tagihan mendatang ${formatRupiah(safeToSpend.data.upcoming_bills)}`}
                  </Text>
                </PocketCard>
              ) : null}

              <PocketCard>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  ALOKASI KATEGORI
                </Text>
                {activeBudget.data.allocations.map((allocation) => (
                  <XStack key={allocation.id} justifyContent="space-between">
                    <Text fontFamily="$body" fontSize="$2" color="$color">
                      {categoriesById.get(allocation.category_id)?.name ?? 'Kategori'}
                    </Text>
                    <Text fontFamily="$mono" fontSize="$2" color="$color">
                      {formatRupiah(allocation.amount)}
                    </Text>
                  </XStack>
                ))}
              </PocketCard>
            </>
          ) : (
            <Text fontFamily="$body" fontSize="$2" color="$kulit">
              PLACEHOLDER_FOR_TASK_20
            </Text>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
