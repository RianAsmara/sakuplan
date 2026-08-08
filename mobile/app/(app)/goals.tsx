import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { SubScreenHeader } from '../../src/components/SubScreenHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { RupiahInput } from '../../src/components/RupiahInput'
import { useGoals } from '../../src/goals/useGoals'
import { useDashboard } from '../../src/dashboard/useDashboard'
import { useContributeToGoal } from '../../src/goals/useContributeToGoal'
import { useAccounts } from '../../src/accounts/useAccounts'
import { formatRupiah } from '../../src/format/money'
import { formatDateID } from '../../src/format/date'

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
      }
    )
  }

  return (
    <PocketCard>
      <XStack justifyContent="space-between">
        <Text fontFamily="$body" fontSize="$3" color="$color">
          {goal.name}
        </Text>
        <Text fontFamily="$mono" fontSize="$2" color="$accent">
          {`${Math.min(progressPercent, 100)}%`}
        </Text>
      </XStack>
      <YStack height={6} borderRadius="$1" backgroundColor="$background" overflow="hidden">
        <YStack height="100%" width={`${Math.min(progressPercent, 100)}%`} backgroundColor="$accent" />
      </YStack>
      <Text fontFamily="$body" fontSize="$1" color="$kulit">
        {`${formatRupiah(contributed)} dari ${formatRupiah(goal.target_amount)}${
          goal.target_date ? ` · target ${formatDateID(goal.target_date)}` : ''
        }`}
      </Text>

      {isAdding ? (
        <YStack gap="$2">
          {contribute.isError ? (
            <Text fontFamily="$body" fontSize="$1" color="$danger">
              Gagal menambah dana. Coba lagi.
            </Text>
          ) : null}
          <RupiahInput value={amount} onChangeValue={setAmount} />
          <XStack gap="$2" flexWrap="wrap">
            {(accounts.data ?? []).map((account) => (
              <Button
                key={account.id}
                size="$3"
                backgroundColor={accountId === account.id ? '$primary' : '$white'}
                color={accountId === account.id ? '$primaryText' : '$color'}
                borderWidth={1.5}
                borderColor={accountId === account.id ? '$primary' : '$borderColor'}
                onPress={() => setAccountId(account.id)}
              >
                {account.name}
              </Button>
            ))}
          </XStack>
          <XStack gap="$2">
            <Button
              flex={1}
              backgroundColor="$white"
              borderWidth={1.5}
              borderColor="$borderColor"
              color="$color"
              onPress={() => setIsAdding(false)}
            >
              Batal
            </Button>
            <Button
              flex={1}
              backgroundColor="$primary"
              color="$primaryText"
              disabled={!canSave}
              opacity={canSave ? 1 : 0.5}
              onPress={handleSave}
            >
              {contribute.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </XStack>
        </YStack>
      ) : (
        <Button
          backgroundColor="transparent"
          borderWidth={1.5}
          borderColor="$primary"
          color="$primary"
          onPress={() => setIsAdding(true)}
        >
          Tambah Dana
        </Button>
      )}
    </PocketCard>
  )
}

export default function GoalsScreen() {
  const goals = useGoals()
  const dashboard = useDashboard()

  const progressByGoalId = new Map(
    (dashboard.data?.goals ?? []).map((progress) => [progress.goal_id, progress])
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$3">
          <SubScreenHeader title="Target Tabungan" />

          {goals.isLoading || dashboard.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : goals.isError || dashboard.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat target tabungan. Coba lagi nanti.
              </Text>
            </PocketCard>
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
            <PocketCard tone="muted">
              <Text fontFamily="$body" fontSize="$3" color="$color" textAlign="center">
                Belum ada target tabungan
              </Text>
            </PocketCard>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
