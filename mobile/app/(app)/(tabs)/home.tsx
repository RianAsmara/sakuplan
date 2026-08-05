import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Text, XStack, YStack, Spinner } from 'tamagui'
import { Bell } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../../src/components/PocketCard'
import { useCurrentUser } from '../../../src/auth/useCurrentUser'
import { useDashboard } from '../../../src/dashboard/useDashboard'
import { formatRupiah } from '../../../src/format/money'
import { billUrgency } from '../../../src/dashboard/billUrgency'

// Placeholder: no notifications endpoint exists yet. Inert until
// NOTIF-001 is implemented on the mobile client.
function handleNotifications() {}

export default function HomeScreen() {
  const { data: user } = useCurrentUser()
  const dashboard = useDashboard()

  const userInitial = user?.display_name?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontFamily="$heading" fontSize="$4" color="$primary">
              SakuPlan
            </Text>
            <XStack alignItems="center" gap="$3">
              <XStack onPress={handleNotifications} alignItems="center" gap="$1">
                <Bell size={16} color="$color" />
              </XStack>
              <YStack
                width={30}
                height={30}
                borderRadius={15}
                borderWidth={1.5}
                borderColor="$primary"
                backgroundColor="$white"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontFamily="$mono" fontSize="$1" color="$primary">
                  {userInitial}
                </Text>
              </YStack>
            </XStack>
          </XStack>

          {dashboard.isLoading || !dashboard.data ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : dashboard.isError ? (
            <PocketCard>
              <Text fontFamily="$body" fontSize="$2" color="$danger">
                Gagal memuat ringkasan. Coba lagi nanti.
              </Text>
            </PocketCard>
          ) : (
            <>
              <Text fontFamily="$body" fontSize="$2" color="$kulit">
                {`Halo, ${user?.display_name ?? ''}. Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari ini.`}
              </Text>

              <PocketCard>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  AMAN DIBELANJAKAN HARI INI
                </Text>
                <Text fontFamily="$mono" fontSize="$6" color="$primary">
                  {formatRupiah(dashboard.data.safe_to_spend_today)}
                </Text>
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  {`${formatRupiah(dashboard.data.safe_to_spend_until_payday)} aman sampai gajian · ${dashboard.data.days_until_payday} hari lagi`}
                </Text>
              </PocketCard>

              <XStack gap="$3">
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    SALDO CAIR
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$color">
                    {formatRupiah(dashboard.data.liquid_balance)}
                  </Text>
                </PocketCard>
                <PocketCard flex={1}>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    ANGGARAN TERPAKAI
                  </Text>
                  <Text fontFamily="$mono" fontSize="$3" color="$color">
                    {formatRupiah(dashboard.data.budget_used)}
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      {` / ${formatRupiah(dashboard.data.budget_total)}`}
                    </Text>
                  </Text>
                </PocketCard>
              </XStack>

              {dashboard.data.upcoming_bill ? (
                <PocketCard>
                  <XStack justifyContent="space-between" alignItems="center">
                    <YStack>
                      <Text fontFamily="$body" fontSize="$1" color="$kulit">
                        TAGIHAN BERIKUTNYA
                      </Text>
                      <Text fontFamily="$body" fontSize="$3" color="$color">
                        {dashboard.data.upcoming_bill.name}
                      </Text>
                      <Text
                        fontFamily="$body"
                        fontSize="$1"
                        color={billUrgency(dashboard.data.upcoming_bill.due_date, new Date()).color}
                      >
                        {billUrgency(dashboard.data.upcoming_bill.due_date, new Date()).label}
                      </Text>
                    </YStack>
                    <Text fontFamily="$mono" fontSize="$3" color="$color">
                      {formatRupiah(dashboard.data.upcoming_bill.amount)}
                    </Text>
                  </XStack>
                </PocketCard>
              ) : null}

              {dashboard.data.goals[0] ? (
                <PocketCard>
                  <XStack justifyContent="space-between">
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      {`TARGET TABUNGAN · ${dashboard.data.goals[0].name}`}
                    </Text>
                    <Text fontFamily="$mono" fontSize="$2" color="$accent">
                      {`${dashboard.data.goals[0].progress_percent}%`}
                    </Text>
                  </XStack>
                  <YStack height={6} borderRadius="$1" backgroundColor="$background" overflow="hidden">
                    <YStack
                      height="100%"
                      width={`${Math.min(dashboard.data.goals[0].progress_percent, 100)}%`}
                      backgroundColor="$accent"
                    />
                  </YStack>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    {`${formatRupiah(dashboard.data.goals[0].contributed)} dari ${formatRupiah(dashboard.data.goals[0].target_amount)}`}
                  </Text>
                </PocketCard>
              ) : null}

              {dashboard.data.top_categories.length > 0 ? (
                <PocketCard>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    KATEGORI TERBESAR BULAN INI
                  </Text>
                  {dashboard.data.top_categories.map((category) => (
                    <XStack key={category.category_id} justifyContent="space-between">
                      <Text fontFamily="$body" fontSize="$2" color="$color">
                        {category.name}
                      </Text>
                      <Text fontFamily="$mono" fontSize="$2" color="$color">
                        {formatRupiah(category.amount)}
                      </Text>
                    </XStack>
                  ))}
                </PocketCard>
              ) : null}
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
