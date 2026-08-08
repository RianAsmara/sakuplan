import { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Checkbox, Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { Check } from '@tamagui/lucide-icons-2'
import { SubScreenHeader } from '../../src/components/SubScreenHeader'
import { PocketCard } from '../../src/components/PocketCard'
import { RupiahInput } from '../../src/components/RupiahInput'
import { useCurrentUser } from '../../src/auth/useCurrentUser'
import { useUpdateProfile } from '../../src/profile/useUpdateProfile'

export default function ProfileScreen() {
  const { data: user, isLoading } = useCurrentUser()
  const updateProfile = useUpdateProfile()

  const [initialized, setInitialized] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [payday, setPayday] = useState(1)
  const [minimumBuffer, setMinimumBuffer] = useState(0)
  const [aiConsent, setAiConsent] = useState(false)

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
          <SubScreenHeader title="Profil & Preferensi" />

          {isLoading || !user ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : (
            <PocketCard elevated>
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
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
