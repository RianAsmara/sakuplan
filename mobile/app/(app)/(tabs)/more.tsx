import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { ChevronRight, PiggyBank, Receipt, User, Wallet } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../../src/components/PocketCard'
import {
  AuthHeading,
  Body,
  BodyS,
  ButtonLabel,
  GroupLabel,
  InlineAction,
  Meta,
  PrimaryButton,
  SecondaryButton,
  TabTitle,
} from '../../../src/components/primitives'
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
      paddingVertical="$3.5"
      borderTopWidth={1}
      borderTopColor="$hairline"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
    >
      <XStack alignItems="center" gap="$3">
        {icon}
        <Body>{label}</Body>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <TabTitle>Lainnya</TabTitle>

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
                    <Body>{user.display_name}</Body>
                    <Meta>{user.email}</Meta>
                  </YStack>
                </XStack>
              </PocketCard>

              <YStack>
                <GroupLabel marginBottom="$1">AKUN</GroupLabel>
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
                <GroupLabel marginBottom="$1">PERENCANAAN</GroupLabel>
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
                <AuthHeading>Akun</AuthHeading>

                <SecondaryButton
                  disabled={exportData.isPending}
                  opacity={exportData.isPending ? 0.5 : 1}
                  onPress={() => exportData.mutate()}
                >
                  <ButtonLabel color="$tinta">
                    {exportData.isPending ? 'Menyiapkan ekspor...' : 'Unduh Data Saya'}
                  </ButtonLabel>
                </SecondaryButton>
                {exportData.isError ? (
                  <BodyS color="$danger">Gagal mengekspor data. Coba lagi.</BodyS>
                ) : null}

                <SecondaryButton disabled={logout.isPending} opacity={logout.isPending ? 0.5 : 1} onPress={() => logout.mutate()}>
                  <ButtonLabel color="$tinta">{logout.isPending ? 'Keluar...' : 'Keluar'}</ButtonLabel>
                </SecondaryButton>

                {confirmLogoutAll ? (
                  <YStack gap="$2">
                    <Meta>Yakin ingin keluar dari semua perangkat?</Meta>
                    <XStack gap="$2">
                      <PrimaryButton
                        flex={1}
                        backgroundColor="$danger"
                        disabled={logoutAll.isPending}
                        opacity={logoutAll.isPending ? 0.5 : 1}
                        onPress={() => logoutAll.mutate()}
                      >
                        <ButtonLabel color="$primaryText">
                          {logoutAll.isPending ? 'Memproses...' : 'Ya, Keluar'}
                        </ButtonLabel>
                      </PrimaryButton>
                      <SecondaryButton flex={1} onPress={() => setConfirmLogoutAll(false)}>
                        <ButtonLabel color="$tinta">Batal</ButtonLabel>
                      </SecondaryButton>
                    </XStack>
                  </YStack>
                ) : (
                  <InlineAction color="$danger" textDecorationLine="underline" onPress={() => setConfirmLogoutAll(true)}>
                    Keluar dari semua perangkat
                  </InlineAction>
                )}
              </PocketCard>

              <PocketCard tone="muted">
                <AuthHeading>Segera Hadir</AuthHeading>
                <XStack justifyContent="space-between" onPress={handleNotifications}>
                  <Meta>Notifikasi</Meta>
                  <Meta>Segera hadir</Meta>
                </XStack>
                <XStack justifyContent="space-between" onPress={handleDeleteAccount}>
                  <Meta color="$danger">Hapus Akun</Meta>
                  <Meta>Segera hadir</Meta>
                </XStack>
              </PocketCard>
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
