import { useEffect, useState } from 'react'
import { User } from '@tamagui/lucide-icons-2'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Spinner, XStack, YStack } from 'tamagui'
import { useCurrentUser } from '../../src/auth/useCurrentUser'
import { nextBillOccurrence } from '../../src/bills/nextBillOccurrence'
import { DetailHeader } from '../../src/components/AppHeader'
import {
  Amount,
  Body,
  ButtonLabel,
  FieldLabel,
  LedgerRow,
  Meta,
  PrimaryButton,
  Screen,
  SectionHeading,
  Toggle,
  inputStyle,
} from '../../src/components/primitives'
import { RupiahInput } from '../../src/components/RupiahInput'
import { TextField } from '../../src/components/TextField'
import { formatDateID } from '../../src/format/date'
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

  const nextPaydayLong = formatDateID(nextBillOccurrence(payday, new Date()).toISOString())

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <DetailHeader title="Profil & preferensi" />
      <ScrollView flex={1} backgroundColor="$kertas">
        <Screen>
          {isLoading || !user ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$terjaga" />
            </YStack>
          ) : (
            <YStack gap="$5">
              {updateProfile.isSuccess ? (
                <Meta color="$terjaga">Perubahan disimpan.</Meta>
              ) : updateProfile.isError ? (
                <Meta color="$peringatan">Gagal menyimpan perubahan. Coba lagi.</Meta>
              ) : null}

              <YStack gap="$3">
                <SectionHeading>Identitas</SectionHeading>
                <YStack gap="$2">
                  <FieldLabel htmlFor="profile-name" icon={<User size={14} color="$kulit" />}>
                    NAMA TAMPILAN
                  </FieldLabel>
                  <TextField
                    id="profile-name"
                    value={displayName}
                    onChangeText={setDisplayName}
                    {...inputStyle}
                  />
                </YStack>
              </YStack>

              <YStack gap="$3">
                <SectionHeading>Gajian dan anggaran</SectionHeading>
                <YStack gap="$2">
                  <FieldLabel htmlFor="profile-payday">TANGGAL GAJIAN SETIAP BULAN</FieldLabel>
                  <TextField
                    id="profile-payday"
                    keyboardType="number-pad"
                    value={String(payday)}
                    onChangeText={(text) => setPayday(Number.parseInt(text, 10) || 1)}
                    {...inputStyle}
                  />
                  <Meta>
                    {`Jika tanggal ini tidak ada di suatu bulan, gajian jatuh di hari terakhir bulan itu. Gajian berikutnya: ${nextPaydayLong}.`}
                  </Meta>
                </YStack>
                <YStack gap="$2">
                  <FieldLabel htmlFor="profile-buffer">BATAS AMAN MINIMUM</FieldLabel>
                  <RupiahInput id="profile-buffer" value={minimumBuffer} onChangeValue={setMinimumBuffer} />
                  <Meta>Selalu disisihkan dari perhitungan aman-belanja sebagai jaga-jaga.</Meta>
                </YStack>
              </YStack>

              <YStack
                gap="$3"
                paddingBottom="$5"
                borderBottomWidth={1}
                borderBottomColor="$hairline"
              >
                <SectionHeading>AI</SectionHeading>
                <XStack justifyContent="space-between" alignItems="center" gap="$3">
                  <YStack flex={1} gap="$1">
                    <Body>Izinkan rekomendasi AI</Body>
                    <Meta>
                      AI hanya memberikan usulan. Perubahan anggaran tetap memerlukan
                      persetujuanmu.
                    </Meta>
                  </YStack>
                  <Toggle value={aiConsent} onValueChange={setAiConsent} />
                </XStack>
              </YStack>

              <YStack>
                <SectionHeading marginBottom="$2">Sistem</SectionHeading>
                <LedgerRow pv={13}>
                  <Body>Bahasa</Body>
                  <Body>Bahasa Indonesia</Body>
                </LedgerRow>
                <LedgerRow pv={13}>
                  <Body>Zona waktu</Body>
                  <Body>{user.timezone}</Body>
                </LedgerRow>
                <LedgerRow pv={13}>
                  <Body>Mata uang</Body>
                  <Amount size={13}>{user.currency}</Amount>
                </LedgerRow>
              </YStack>

              <PrimaryButton
                disabled={displayName.trim().length === 0 || updateProfile.isPending}
                opacity={displayName.trim().length === 0 ? 0.5 : 1}
                onPress={handleSaveProfile}
              >
                <ButtonLabel color="$putih">
                  {updateProfile.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </ButtonLabel>
              </PrimaryButton>
            </YStack>
          )}
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
