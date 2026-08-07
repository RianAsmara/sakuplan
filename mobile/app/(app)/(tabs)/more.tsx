import { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Checkbox, Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { Check } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../../src/components/PocketCard'
import { RupiahInput } from '../../../src/components/RupiahInput'
import { useCurrentUser } from '../../../src/auth/useCurrentUser'
import { useLogout } from '../../../src/auth/useLogout'
import { useLogoutAll } from '../../../src/auth/useLogoutAll'
import { useUpdateProfile } from '../../../src/profile/useUpdateProfile'
import { useExportData } from '../../../src/profile/useExportData'

// Placeholder: NOTIF-001..004 have zero backend support (confirmed via
// docs/P0_GAP_ANALYSIS.md) — no preferences model, no delivery, nothing to
// wire this row up to yet.
function handleNotifications() {}

// Placeholder: USER-004 (account deletion) has zero backend support — the
// `deletion_pending` status exists in the domain/schema but no endpoint,
// handler, or job ever sets or drives it.
function handleDeleteAccount() {}

export default function MoreScreen() {
  const { data: user, isLoading } = useCurrentUser()
  const logout = useLogout()
  const logoutAll = useLogoutAll()
  const updateProfile = useUpdateProfile()
  const exportData = useExportData()

  const [initialized, setInitialized] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [payday, setPayday] = useState(1)
  const [minimumBuffer, setMinimumBuffer] = useState(0)
  const [aiConsent, setAiConsent] = useState(false)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  useEffect(() => {
    if (user && !initialized) {
      /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
         of editable profile form state from the query result once it loads;
         not a per-render derived value. */
      setDisplayName(user.display_name)
      setPayday(user.payday)
      setMinimumBuffer(user.minimum_buffer)
      setAiConsent(user.ai_consent)
      setInitialized(true)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [user, initialized])

  const userInitial = user?.display_name?.trim()?.[0]?.toUpperCase() ?? '?'

  function handleSaveProfile() {
    if (!user) return
    updateProfile.mutate({
      display_name: displayName.trim(),
      currency: user.currency,
      timezone: user.timezone,
      payday: Math.min(31, Math.max(1, payday)),
      minimum_buffer: minimumBuffer,
      ai_consent: aiConsent,
    })
  }

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

              <PocketCard elevated>
                <Text fontFamily="$heading" fontSize="$4" color="$color">
                  Profil
                </Text>

                {updateProfile.isSuccess ? (
                  <Text fontFamily="$body" fontSize="$2" color="$primary">
                    Perubahan disimpan.
                  </Text>
                ) : updateProfile.isError ? (
                  <Text fontFamily="$body" fontSize="$2" color="$danger">
                    Gagal menyimpan perubahan. Coba lagi.
                  </Text>
                ) : null}

                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    NAMA
                  </Text>
                  <Input
                    value={displayName}
                    onChangeText={setDisplayName}
                    color="$color"
                    focusStyle={{ borderColor: '$borderColorFocus' }}
                  />
                </YStack>

                <XStack gap="$3">
                  <YStack flex={1} gap="$2">
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      MATA UANG
                    </Text>
                    <Text fontFamily="$body" fontSize="$2" color="$kulit">
                      {user.currency}
                    </Text>
                  </YStack>
                  <YStack flex={1} gap="$2">
                    <Text fontFamily="$body" fontSize="$1" color="$kulit">
                      ZONA WAKTU
                    </Text>
                    <Text fontFamily="$body" fontSize="$2" color="$kulit">
                      {user.timezone}
                    </Text>
                  </YStack>
                </XStack>
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  Mata uang dan zona waktu belum bisa diganti.
                </Text>

                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    TANGGAL GAJIAN (1-31)
                  </Text>
                  <Input
                    keyboardType="number-pad"
                    value={String(payday)}
                    onChangeText={(text) => setPayday(Number.parseInt(text, 10) || 1)}
                    color="$color"
                    focusStyle={{ borderColor: '$borderColorFocus' }}
                  />
                </YStack>

                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    DANA DARURAT MINIMUM
                  </Text>
                  <RupiahInput value={minimumBuffer} onChangeValue={setMinimumBuffer} />
                </YStack>

                <XStack alignItems="center" gap="$3">
                  <Checkbox
                    id="ai-consent"
                    checked={aiConsent}
                    onCheckedChange={(value) => setAiConsent(value === true)}
                    backgroundColor={aiConsent ? '$primary' : undefined}
                    borderColor="$kulit"
                  >
                    <Checkbox.Indicator>
                      <Check color="$primaryText" />
                    </Checkbox.Indicator>
                  </Checkbox>
                  <Text fontFamily="$body" fontSize="$2" color="$color" flexShrink={1}>
                    Izinkan SakuPlan memakai AI untuk menjelaskan rekomendasi anggaran
                  </Text>
                </XStack>

                <Button
                  backgroundColor="$primary"
                  color="$primaryText"
                  disabled={displayName.trim().length === 0 || updateProfile.isPending}
                  onPress={handleSaveProfile}
                >
                  {updateProfile.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </PocketCard>

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
