import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { ChevronRight, PiggyBank, Receipt, User, Wallet } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../../src/components/PocketCard'
import { useCurrentUser } from '../../../src/auth/useCurrentUser'
import { useLogout } from '../../../src/auth/useLogout'
import { useLogoutAll } from '../../../src/auth/useLogoutAll'
import { useExportData } from '../../../src/profile/useExportData'

// Placeholder: NOTIF-001..004 have zero backend support (confirmed via
// docs/P0_GAP_ANALYSIS.md) — no preferences model, no delivery, nothing to
// wire this row up to yet.
function handleNotifications() {}

// Placeholder: USER-004 (account deletion) has zero backend support — the
// `deletion_pending` status exists in the domain/schema but no endpoint,
// handler, or job ever sets or drives it.
function handleDeleteAccount() {}

function NavRow({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode
  label: string
  onPress: () => void
}) {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      paddingVertical="$3"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
    >
      <XStack alignItems="center" gap="$3">
        {icon}
        <Text fontFamily="$body" fontSize="$3" color="$color">
          {label}
        </Text>
      </XStack>
      <ChevronRight size={16} color="$kulit" />
    </XStack>
  )
}

export default function MoreScreen() {
  const router = useRouter()
  const { data: user, isLoading } = useCurrentUser()
  const logout = useLogout()
  const logoutAll = useLogoutAll()
  const exportData = useExportData()

  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  const userInitial = user?.display_name?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <Text fontFamily="$heading" fontSize="$4" color="$color">
            Lainnya
          </Text>

          {isLoading || !user ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : (
            <>
              <PocketCard>
                <XStack alignItems="center" gap="$3">
                  <YStack
                    width={44}
                    height={44}
                    borderRadius={22}
                    borderWidth={1.5}
                    borderColor="$primary"
                    backgroundColor="$white"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontFamily="$mono" fontSize="$3" color="$primary">
                      {userInitial}
                    </Text>
                  </YStack>
                  <YStack>
                    <Text fontFamily="$body" fontSize="$3" color="$color">
                      {user.display_name}
                    </Text>
                    <Text fontFamily="$body" fontSize="$2" color="$kulit">
                      {user.email}
                    </Text>
                  </YStack>
                </XStack>
              </PocketCard>

              <YStack>
                <Text fontFamily="$body" fontSize="$1" color="$kulit" marginBottom="$1">
                  AKUN
                </Text>
                <NavRow
                  icon={<User size={16} color="$kulit" />}
                  label="Profil & preferensi"
                  onPress={() => router.push('/(app)/profile')}
                />
                <NavRow
                  icon={<Wallet size={16} color="$kulit" />}
                  label="Akun & saldo"
                  onPress={() => router.push('/(app)/accounts')}
                />
              </YStack>

              <YStack>
                <Text fontFamily="$body" fontSize="$1" color="$kulit" marginBottom="$1">
                  PERENCANAAN
                </Text>
                <NavRow
                  icon={<Receipt size={16} color="$kulit" />}
                  label="Tagihan berulang"
                  onPress={() => router.push('/(app)/bills')}
                />
                <NavRow
                  icon={<PiggyBank size={16} color="$kulit" />}
                  label="Target tabungan"
                  onPress={() => router.push('/(app)/goals')}
                />
              </YStack>

              <PocketCard>
                <Text fontFamily="$heading" fontSize="$4" color="$color">
                  Akun
                </Text>

                <Button
                  backgroundColor="$white"
                  borderWidth={1.5}
                  borderColor="$borderColor"
                  color="$color"
                  disabled={exportData.isPending}
                  onPress={() => exportData.mutate()}
                >
                  {exportData.isPending ? 'Menyiapkan ekspor...' : 'Unduh Data Saya'}
                </Button>
                {exportData.isError ? (
                  <Text fontFamily="$body" fontSize="$1" color="$danger">
                    Gagal mengekspor data. Coba lagi.
                  </Text>
                ) : null}

                <Button
                  backgroundColor="$white"
                  borderWidth={1.5}
                  borderColor="$borderColor"
                  color="$color"
                  disabled={logout.isPending}
                  onPress={() => logout.mutate()}
                >
                  {logout.isPending ? 'Keluar...' : 'Keluar'}
                </Button>

                {confirmLogoutAll ? (
                  <YStack gap="$2">
                    <Text fontFamily="$body" fontSize="$2" color="$kulit">
                      Yakin ingin keluar dari semua perangkat?
                    </Text>
                    <XStack gap="$2">
                      <Button
                        flex={1}
                        backgroundColor="$danger"
                        color="$white"
                        disabled={logoutAll.isPending}
                        onPress={() => logoutAll.mutate()}
                      >
                        {logoutAll.isPending ? 'Memproses...' : 'Ya, Keluar'}
                      </Button>
                      <Button flex={1} backgroundColor="$white" borderWidth={1.5} borderColor="$borderColor" color="$color" onPress={() => setConfirmLogoutAll(false)}>
                        Batal
                      </Button>
                    </XStack>
                  </YStack>
                ) : (
                  <Text
                    fontFamily="$body"
                    fontSize="$2"
                    color="$danger"
                    textDecorationLine="underline"
                    onPress={() => setConfirmLogoutAll(true)}
                  >
                    Keluar dari semua perangkat
                  </Text>
                )}
              </PocketCard>

              <PocketCard tone="muted">
                <Text fontFamily="$heading" fontSize="$4" color="$color">
                  Segera Hadir
                </Text>
                <XStack justifyContent="space-between" onPress={handleNotifications}>
                  <Text fontFamily="$body" fontSize="$2" color="$kulit">
                    Notifikasi
                  </Text>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    Segera hadir
                  </Text>
                </XStack>
                <XStack justifyContent="space-between" onPress={handleDeleteAccount}>
                  <Text fontFamily="$body" fontSize="$2" color="$danger">
                    Hapus Akun
                  </Text>
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    Segera hadir
                  </Text>
                </XStack>
              </PocketCard>
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
