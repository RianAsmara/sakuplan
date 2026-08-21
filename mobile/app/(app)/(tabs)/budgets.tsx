import { useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, XStack, YStack } from 'tamagui'
import { ApiError } from '../../../src/api/errors'
import type { components } from '../../../src/api/client'
import { computeUnallocated } from '../../../src/budgets/budgetMath'
import { riskLevelMeta } from '../../../src/budgets/riskLevel'
import { useActiveBudget } from '../../../src/budgets/useActiveBudget'
import { useCreateAndActivateBudget } from '../../../src/budgets/useCreateAndActivateBudget'
import { useCreateBudgetRecommendation } from '../../../src/budgets/useCreateBudgetRecommendation'
import { useSafeToSpend } from '../../../src/budgets/useSafeToSpend'
import { useCategories } from '../../../src/categories/useCategories'
import { TabHeader } from '../../../src/components/AppHeader'
import { DashedBox } from '../../../src/components/DashedBox'
import { PocketCard } from '../../../src/components/PocketCard'
import { ProgressBar } from '../../../src/components/ProgressBar'
import {
  Amount,
  Body,
  BodyS,
  ButtonLabel,
  FieldLabel,
  Meta,
  MetaS,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeading,
  SegmentButton,
  SegmentLabel,
} from '../../../src/components/primitives'
import { RupiahInput } from '../../../src/components/RupiahInput'
import { endOfMonth, formatDateID, startOfMonth, toRFC3339 } from '../../../src/format/date'
import { formatRupiah } from '../../../src/format/money'
import { useCashFlowReport } from '../../../src/reports/useCashFlowReport'

type RecommendationMode = components['schemas']['RecommendationRequest']['mode']

const MODE_LABELS: Record<RecommendationMode, string> = {
  conservative: 'Konservatif',
  balanced: 'Seimbang',
  flexible: 'Fleksibel',
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <YStack
      backgroundColor="$peringatanFill"
      borderLeftWidth={3}
      borderLeftColor="$peringatan"
      borderRadius="$1.5"
      paddingHorizontal="$3"
      paddingVertical="$2.5"
    >
      <BodyS color="$tinta">{children}</BodyS>
    </YStack>
  )
}

function AllocationRow({
  name,
  allocated,
  actual,
}: {
  name: string
  allocated: number
  actual: number
}) {
  const over = actual > allocated
  const rawPct = allocated > 0 ? (actual / allocated) * 100 : actual > 0 ? 100 : 0
  const pct = Math.round(rawPct)
  const overage = actual - allocated

  return (
    <YStack paddingVertical={14} borderTopWidth={1} borderTopColor="$hairline" gap="$2">
      <XStack justifyContent="space-between" alignItems="center">
        <Body>{name}</Body>
        <Amount size={13} color={over ? '$peringatan' : '$kulit'}>{`${pct}%`}</Amount>
      </XStack>
      <ProgressBar pct={Math.min(pct, 100)} height={5} fill={over ? '$peringatan' : '$terjaga'} />
      <Meta color={over ? '$peringatan' : '$kulit'}>
        {over
          ? `Melebihi anggaran ${formatRupiah(overage)}`
          : `${formatRupiah(actual)} dari ${formatRupiah(allocated)}`}
      </Meta>
    </YStack>
  )
}

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
      },
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
    <PocketCard elevated gap="$4">
      <SectionHeading>Buat Anggaran Bulan Ini</SectionHeading>

      {step === 'basics' ? (
        <YStack gap="$3">
          <YStack gap="$2">
            <FieldLabel htmlFor="budget-income">PEMASUKAN DIHARAPKAN</FieldLabel>
            <RupiahInput id="budget-income" value={expectedIncome} onChangeValue={setExpectedIncome} />
          </YStack>
          <YStack gap="$2">
            <FieldLabel htmlFor="budget-savings">KOMITMEN TABUNGAN</FieldLabel>
            <RupiahInput id="budget-savings" value={savingsCommitment} onChangeValue={setSavingsCommitment} />
          </YStack>
          <YStack gap="$2">
            <FieldLabel htmlFor="budget-buffer">DANA DARURAT MINIMUM</FieldLabel>
            <RupiahInput id="budget-buffer" value={minimumBuffer} onChangeValue={setMinimumBuffer} />
          </YStack>
          <YStack gap="$2">
            <FieldLabel htmlFor="budget-mode">GAYA ALOKASI</FieldLabel>
            <XStack gap="$2">
              {(['conservative', 'balanced', 'flexible'] as RecommendationMode[]).map((option) => (
                <SegmentButton key={option} selected={mode === option} onPress={() => setMode(option)}>
                  <SegmentLabel selected={mode === option}>{MODE_LABELS[option]}</SegmentLabel>
                </SegmentButton>
              ))}
            </XStack>
          </YStack>
          <SecondaryButton
            disabled={expectedIncome <= 0 || recommend.isPending}
            opacity={expectedIncome <= 0 ? 0.5 : 1}
            onPress={handleGetRecommendation}
          >
            <ButtonLabel color="$tinta">
              {recommend.isPending ? 'Menghitung...' : 'Dapatkan Saran Alokasi'}
            </ButtonLabel>
          </SecondaryButton>
          <PrimaryButton
            disabled={expectedIncome <= 0}
            opacity={expectedIncome <= 0 ? 0.5 : 1}
            onPress={() => setStep('allocate')}
          >
            <ButtonLabel color="$putih">Lanjut</ButtonLabel>
          </PrimaryButton>
        </YStack>
      ) : null}

      {step === 'allocate' ? (
        <YStack gap="$3">
          {expenseCategories.data?.map((category) => (
            <YStack key={category.id} gap="$2">
              <Body>{category.name}</Body>
              <RupiahInput
                value={allocations[category.id] ?? 0}
                onChangeValue={(value) => setAllocations((prev) => ({ ...prev, [category.id]: value }))}
              />
            </YStack>
          ))}
          <PocketCard tone="muted">
            <Meta color={unallocated < 0 ? '$peringatan' : '$kulit'}>
              {`Belum dialokasikan: ${formatRupiah(unallocated)}`}
            </Meta>
          </PocketCard>
          <XStack gap="$2">
            <SecondaryButton flex={1} onPress={() => setStep('basics')}>
              <ButtonLabel color="$tinta">Kembali</ButtonLabel>
            </SecondaryButton>
            <PrimaryButton flex={1} onPress={() => setStep('review')}>
              <ButtonLabel color="$putih">Lanjut</ButtonLabel>
            </PrimaryButton>
          </XStack>
        </YStack>
      ) : null}

      {step === 'review' ? (
        <YStack gap="$3">
          <Meta>
            {`Pemasukan ${formatRupiah(expectedIncome)} · Tabungan ${formatRupiah(savingsCommitment)} · Dana darurat ${formatRupiah(minimumBuffer)}`}
          </Meta>
          <Meta color={unallocated < 0 ? '$peringatan' : '$kulit'}>
            {`Belum dialokasikan: ${formatRupiah(unallocated)}`}
          </Meta>
          {isConflict ? (
            <ErrorBanner>
              Sudah ada anggaran aktif atau draf yang tumpang tindih untuk periode ini. Muat ulang
              layar ini.
            </ErrorBanner>
          ) : createAndActivate.isError ? (
            <ErrorBanner>Gagal membuat anggaran. Coba lagi.</ErrorBanner>
          ) : null}
          <XStack gap="$2">
            <SecondaryButton flex={1} onPress={() => setStep('allocate')}>
              <ButtonLabel color="$tinta">Kembali</ButtonLabel>
            </SecondaryButton>
            <PrimaryButton
              flex={1}
              disabled={unallocated < 0 || createAndActivate.isPending}
              opacity={unallocated < 0 ? 0.5 : 1}
              onPress={handleSubmit}
            >
              <ButtonLabel color="$putih">
                {createAndActivate.isPending ? 'Membuat...' : 'Buat & Aktifkan Anggaran'}
              </ButtonLabel>
            </PrimaryButton>
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
    [allCategories.data],
  )

  // No PATCH endpoint exists to update a single allocation on an active
  // budget — SCREENS.md's "Ubah" inline editor is omitted until the API
  // supports it (see docs/PROGRESS.md 2026-08-21 entry).
  const periodStart = activeBudget.data?.start_date ?? toRFC3339(startOfMonth(new Date()))
  const periodEnd = activeBudget.data?.end_date ?? toRFC3339(endOfMonth(new Date()))
  const cashFlow = useCashFlowReport({ start: periodStart, end: periodEnd })
  const actualByCategory = useMemo(
    () => new Map((cashFlow.data?.budget_vs_actual ?? []).map((line) => [line.category_id, line.actual])),
    [cashFlow.data],
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$kertas">
        <Screen gap="$4">
          <TabHeader title="Anggaran" />

          {activeBudget.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$terjaga" />
            </YStack>
          ) : activeBudget.isError ? (
            <Meta color="$peringatan">Gagal memuat anggaran. Coba lagi nanti.</Meta>
          ) : activeBudget.data ? (
            <>
              <PocketCard>
                <Meta>PERIODE ANGGARAN AKTIF</Meta>
                <Body>
                  {`${formatDateID(activeBudget.data.start_date)} – ${formatDateID(activeBudget.data.end_date)}`}
                </Body>
              </PocketCard>

              <XStack gap="$3">
                <PocketCard flex={1}>
                  <Meta>PEMASUKAN DIHARAPKAN</Meta>
                  <Amount size={16}>{formatRupiah(activeBudget.data.expected_income)}</Amount>
                </PocketCard>
                <PocketCard flex={1}>
                  <Meta>KOMITMEN TABUNGAN</Meta>
                  <Amount size={16}>{formatRupiah(activeBudget.data.savings_commitment)}</Amount>
                </PocketCard>
              </XStack>

              {safeToSpend.data ? (
                <DashedBox color="#006B5E" fill="rgba(0,107,94,0.06)" radius={12} style={{ padding: 18 }}>
                  <YStack gap="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Meta>AMAN DIBELANJAKAN PER HARI</Meta>
                      <MetaS color={riskLevelMeta(safeToSpend.data.risk_level).color}>
                        {riskLevelMeta(safeToSpend.data.risk_level).label.toUpperCase()}
                      </MetaS>
                    </XStack>
                    <Amount size={36} color="$terjaga">
                      {formatRupiah(safeToSpend.data.daily)}
                    </Amount>
                    <Meta>
                      {`${safeToSpend.data.days_remaining} hari lagi sampai gajian · Tagihan mendatang ${formatRupiah(safeToSpend.data.upcoming_bills)}`}
                    </Meta>
                  </YStack>
                </DashedBox>
              ) : null}

              <YStack>
                <SectionHeading marginBottom="$2">Alokasi Kategori</SectionHeading>
                {cashFlow.isLoading ? (
                  <YStack alignItems="center" paddingTop="$4">
                    <Spinner color="$terjaga" />
                  </YStack>
                ) : (
                  activeBudget.data.allocations.map((allocation) => (
                    <AllocationRow
                      key={allocation.id}
                      name={categoriesById.get(allocation.category_id)?.name ?? 'Kategori'}
                      allocated={allocation.amount}
                      actual={actualByCategory.get(allocation.category_id) ?? 0}
                    />
                  ))
                )}
              </YStack>
            </>
          ) : (
            <>
              <PocketCard tone="muted">
                <Body textAlign="center">Belum ada anggaran aktif</Body>
                <Meta textAlign="center">Buat anggaran bulan ini supaya kamu tahu batas amanmu.</Meta>
              </PocketCard>
              <BudgetWizard />
            </>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
