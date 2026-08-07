import { useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { PocketCard } from '../../../src/components/PocketCard'
import { formatDateID, endOfMonth, startOfMonth, toRFC3339 } from '../../../src/format/date'
import { formatRupiah } from '../../../src/format/money'
import { useActiveBudget } from '../../../src/budgets/useActiveBudget'
import { useSafeToSpend } from '../../../src/budgets/useSafeToSpend'
import { riskLevelMeta } from '../../../src/budgets/riskLevel'
import { useCategories } from '../../../src/categories/useCategories'
import { RupiahInput } from '../../../src/components/RupiahInput'
import { ApiError } from '../../../src/api/errors'
import { computeUnallocated } from '../../../src/budgets/budgetMath'
import { useCreateBudgetRecommendation } from '../../../src/budgets/useCreateBudgetRecommendation'
import { useCreateAndActivateBudget } from '../../../src/budgets/useCreateAndActivateBudget'
import type { components } from '../../../src/api/client'

type RecommendationMode = components['schemas']['RecommendationRequest']['mode']

function BudgetWizard() {
  const [step, setStep] = useState<'basics' | 'allocate' | 'review'>('basics')
  const [expectedIncome, setExpectedIncome] = useState(0)
  const [savingsCommitment, setSavingsCommitment] = useState(0)
  const [minimumBuffer, setMinimumBuffer] = useState(0)
  const [mode, setMode] = useState<RecommendationMode>('balanced')
  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [usedRecommendation, setUsedRecommendation] = useState(false)

  const expenseCategories = useCategories('expense')
  const recommend = useCreateBudgetRecommendation()
  const createAndActivate = useCreateAndActivateBudget()

  const unallocated = computeUnallocated(expectedIncome, savingsCommitment, minimumBuffer, allocations)
  const isConflict = createAndActivate.error instanceof ApiError && createAndActivate.error.status === 409

  function handleGetRecommendation() {
    recommend.mutate(
      {
        expected_income: expectedIncome,
        fixed_bills: 0,
        debt_payments: 0,
        minimum_buffer: minimumBuffer,
        requested_savings: savingsCommitment,
        mode,
      },
      {
        onSuccess: (data) => {
          setAllocations(data.allocations)
          setSavingsCommitment(data.savings_commitment)
          setMinimumBuffer(data.minimum_buffer)
          setUsedRecommendation(true)
        },
      }
    )
  }

  function handleSubmit() {
    const now = new Date()
    createAndActivate.mutate({
      start_date: toRFC3339(startOfMonth(now)),
      end_date: toRFC3339(endOfMonth(now)),
      expected_income: expectedIncome,
      savings_commitment: savingsCommitment,
      minimum_buffer: minimumBuffer,
      source: usedRecommendation ? 'rule_based' : 'manual',
      allocations,
    })
  }

  return (
    <PocketCard elevated>
      <Text fontFamily="$heading" fontSize="$4" color="$color">
        Buat Anggaran Bulan Ini
      </Text>

      {step === 'basics' ? (
        <YStack gap="$3">
          <YStack gap="$2">
            <Text fontFamily="$body" fontSize="$1" color="$kulit">
              PEMASUKAN DIHARAPKAN
            </Text>
            <RupiahInput value={expectedIncome} onChangeValue={setExpectedIncome} />
          </YStack>
          <YStack gap="$2">
            <Text fontFamily="$body" fontSize="$1" color="$kulit">
              KOMITMEN TABUNGAN
            </Text>
            <RupiahInput value={savingsCommitment} onChangeValue={setSavingsCommitment} />
          </YStack>
          <YStack gap="$2">
            <Text fontFamily="$body" fontSize="$1" color="$kulit">
              DANA DARURAT MINIMUM
            </Text>
            <RupiahInput value={minimumBuffer} onChangeValue={setMinimumBuffer} />
          </YStack>
          <YStack gap="$2">
            <Text fontFamily="$body" fontSize="$1" color="$kulit">
              GAYA ALOKASI
            </Text>
            <XStack gap="$2">
              {(['conservative', 'balanced', 'flexible'] as RecommendationMode[]).map((option) => (
                <Button
                  key={option}
                  flex={1}
                  size="$3"
                  backgroundColor={mode === option ? '$primary' : '$white'}
                  color={mode === option ? '$primaryText' : '$color'}
                  borderWidth={1.5}
                  borderColor={mode === option ? '$primary' : '$borderColor'}
                  onPress={() => setMode(option)}
                >
                  {option === 'conservative' ? 'Konservatif' : option === 'balanced' ? 'Seimbang' : 'Fleksibel'}
                </Button>
              ))}
            </XStack>
          </YStack>
          <Button
            backgroundColor="$white"
            borderWidth={1.5}
            borderColor="$borderColor"
            color="$color"
            disabled={expectedIncome <= 0 || recommend.isPending}
            onPress={handleGetRecommendation}
          >
            {recommend.isPending ? 'Menghitung...' : 'Dapatkan Saran Alokasi'}
          </Button>
          <Button
            backgroundColor="$primary"
            color="$primaryText"
            disabled={expectedIncome <= 0}
            onPress={() => setStep('allocate')}
          >
            Lanjut
          </Button>
        </YStack>
      ) : null}

      {step === 'allocate' ? (
        <YStack gap="$3">
          {expenseCategories.data?.map((category) => (
            <YStack key={category.id} gap="$2">
              <Text fontFamily="$body" fontSize="$2" color="$color">
                {category.name}
              </Text>
              <RupiahInput
                value={allocations[category.id] ?? 0}
                onChangeValue={(value) => setAllocations((prev) => ({ ...prev, [category.id]: value }))}
              />
            </YStack>
          ))}
          <PocketCard tone="muted">
            <Text fontFamily="$body" fontSize="$2" color={unallocated < 0 ? '$danger' : '$kulit'}>
              {`Belum dialokasikan: ${formatRupiah(unallocated)}`}
            </Text>
          </PocketCard>
          <XStack gap="$2">
            <Button flex={1} backgroundColor="$white" borderWidth={1.5} borderColor="$borderColor" color="$color" onPress={() => setStep('basics')}>
              Kembali
            </Button>
            <Button flex={1} backgroundColor="$primary" color="$primaryText" onPress={() => setStep('review')}>
              Lanjut
            </Button>
          </XStack>
        </YStack>
      ) : null}

      {step === 'review' ? (
        <YStack gap="$3">
          <Text fontFamily="$body" fontSize="$2" color="$kulit">
            {`Pemasukan ${formatRupiah(expectedIncome)} · Tabungan ${formatRupiah(savingsCommitment)} · Dana darurat ${formatRupiah(minimumBuffer)}`}
          </Text>
          <Text fontFamily="$body" fontSize="$2" color={unallocated < 0 ? '$danger' : '$kulit'}>
            {`Belum dialokasikan: ${formatRupiah(unallocated)}`}
          </Text>
          {isConflict ? (
            <Text fontFamily="$body" fontSize="$2" color="$danger">
              Sudah ada anggaran aktif atau draf yang tumpang tindih untuk periode ini. Muat ulang layar ini.
            </Text>
          ) : createAndActivate.isError ? (
            <Text fontFamily="$body" fontSize="$2" color="$danger">
              Gagal membuat anggaran. Coba lagi.
            </Text>
          ) : null}
          <XStack gap="$2">
            <Button flex={1} backgroundColor="$white" borderWidth={1.5} borderColor="$borderColor" color="$color" onPress={() => setStep('allocate')}>
              Kembali
            </Button>
            <Button
              flex={1}
              backgroundColor="$primary"
              color="$primaryText"
              disabled={unallocated < 0 || createAndActivate.isPending}
              opacity={unallocated < 0 ? 0.5 : 1}
              onPress={handleSubmit}
            >
              {createAndActivate.isPending ? 'Membuat...' : 'Buat & Aktifkan Anggaran'}
            </Button>
          </XStack>
        </YStack>
      ) : null}
    </PocketCard>
  )
}

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
            <>
              <PocketCard tone="muted">
                <Text fontFamily="$body" fontSize="$3" color="$color" textAlign="center">
                  Belum ada anggaran aktif
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$kulit" textAlign="center">
                  Buat anggaran bulan ini supaya kamu tahu batas amanmu.
                </Text>
              </PocketCard>
              <BudgetWizard />
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
