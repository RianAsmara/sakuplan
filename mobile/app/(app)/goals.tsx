import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, XStack, YStack } from 'tamagui'
import { useAccounts } from '../../src/accounts/useAccounts'
import { DetailHeader } from '../../src/components/AppHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { ProgressBar } from '../../src/components/ProgressBar'
import {
  Amount,
  Body,
  ButtonLabel,
  Chip,
  ChipLabel,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '../../src/components/primitives'
import { RupiahInput } from '../../src/components/RupiahInput'
import { useContributeToGoal } from '../../src/goals/useContributeToGoal'
import { useGoals } from '../../src/goals/useGoals'
import { useDashboard } from '../../src/dashboard/useDashboard'
import { formatDateID } from '../../src/format/date'
import { formatRupiah } from '../../src/format/money'

function GoalCard({
  goal,
  contributed,
  progressPercent,
}: {
  goal: { id: string; name: string; target_amount: number; target_date?: string }
  contributed: number
  progressPercent: number
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [amount, setAmount] = useState(0)
  const [accountId, setAccountId] = useState<string | null>(null)
  const accounts = useAccounts()
  const contribute = useContributeToGoal()

  const pct = Math.min(progressPercent, 100)
  const canSave = amount > 0 && accountId !== null && !contribute.isPending

  function handleSave() {
    if (!accountId) return
    contribute.mutate(
      { goalId: goal.id, accountId, amount },
      {
        onSuccess: () => {
          setIsAdding(false)
          setAmount(0)
          setAccountId(null)
        },
      },
    )
  }

  return (
    <PocketCard marginBottom="$3">
      <XStack justifyContent="space-between">
        <Body>{goal.name}</Body>
        <Amount size={13} color="$leluasa">{`${pct}%`}</Amount>
      </XStack>
      <ProgressBar pct={pct} height={6} fill="$leluasa" tick />
      <Meta>
        {`${formatRupiah(contributed)} dari ${formatRupiah(goal.target_amount)}${
          goal.target_date ? ` · target ${formatDateID(goal.target_date)}` : ''
        }`}
      </Meta>

      {isAdding ? (
        <YStack gap="$2">
          {contribute.isError ? <Meta color="$peringatan">Gagal menambah dana. Coba lagi.</Meta> : null}
          <RupiahInput value={amount} onChangeValue={setAmount} />
          <XStack gap="$2" flexWrap="wrap">
            {(accounts.data ?? []).map((account) => (
              <Chip
                key={account.id}
                selected={accountId === account.id}
                hitSlop={8}
                onPress={() => setAccountId(account.id)}
              >
                <ChipLabel selected={accountId === account.id}>{account.name}</ChipLabel>
              </Chip>
            ))}
          </XStack>
          <XStack gap="$2">
            <SecondaryButton flex={1} onPress={() => setIsAdding(false)}>
              <ButtonLabel color="$tinta">Batal</ButtonLabel>
            </SecondaryButton>
            <PrimaryButton
              flex={1}
              disabled={!canSave}
              opacity={canSave ? 1 : 0.5}
              onPress={handleSave}
            >
              <ButtonLabel color="$putih">
                {contribute.isPending ? 'Menyimpan...' : 'Simpan'}
              </ButtonLabel>
            </PrimaryButton>
          </XStack>
        </YStack>
      ) : (
        <SecondaryButton
          borderColor="$terjaga"
          borderRadius={6}
          paddingVertical={11}
          onPress={() => setIsAdding(true)}
        >
          <ButtonLabel color="$terjaga">Tambah Dana</ButtonLabel>
        </SecondaryButton>
      )}
    </PocketCard>
  )
}

export default function GoalsScreen() {
  const goals = useGoals()
  const dashboard = useDashboard()

  const progressByGoalId = new Map(
    (dashboard.data?.goals ?? []).map((progress) => [progress.goal_id, progress]),
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <DetailHeader title="Target tabungan" />
      <ScrollView flex={1} backgroundColor="$kertas">
        <Screen>
          {goals.isLoading || dashboard.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$terjaga" />
            </YStack>
          ) : goals.isError || dashboard.isError ? (
            <Meta color="$peringatan">Gagal memuat target tabungan. Coba lagi nanti.</Meta>
          ) : goals.data && goals.data.length > 0 ? (
            goals.data.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                contributed={progressByGoalId.get(goal.id)?.contributed ?? 0}
                progressPercent={progressByGoalId.get(goal.id)?.progress_percent ?? 0}
              />
            ))
          ) : (
            <Meta textAlign="center">Belum ada target tabungan</Meta>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
