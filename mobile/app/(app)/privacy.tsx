import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, XStack, YStack } from 'tamagui'
import { useLogout } from '../../src/auth/useLogout'
import { useLogoutAll } from '../../src/auth/useLogoutAll'
import { DetailHeader } from '../../src/components/AppHeader'
import {
  Body,
  ButtonLabel,
  InlineAction,
  Meta,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeading,
} from '../../src/components/primitives'
import { useExportData } from '../../src/profile/useExportData'

export default function PrivacyScreen() {
  const logout = useLogout()
  const logoutAll = useLogoutAll()
  const exportData = useExportData()

  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <DetailHeader title="Privasi & keamanan" />
      <ScrollView flex={1} backgroundColor="$kertas">
        <Screen gap="$5">
          <YStack gap="$3">
            <SectionHeading>Sesi aktif</SectionHeading>
            {/* No endpoint lists individual sessions (device/last-active) —
                only revoke-current and revoke-all exist, so this section
                offers those two actions rather than the specced list. */}
            <SecondaryButton
              disabled={logout.isPending}
              opacity={logout.isPending ? 0.5 : 1}
              onPress={() => logout.mutate()}
            >
              <ButtonLabel color="$tinta">{logout.isPending ? 'Keluar...' : 'Keluar'}</ButtonLabel>
            </SecondaryButton>

            {confirmLogoutAll ? (
              <YStack gap="$2">
                <Meta>Yakin ingin keluar dari semua perangkat?</Meta>
                <XStack gap="$2">
                  <PrimaryButton
                    flex={1}
                    backgroundColor="$peringatan"
                    disabled={logoutAll.isPending}
                    opacity={logoutAll.isPending ? 0.5 : 1}
                    onPress={() => logoutAll.mutate()}
                  >
                    <ButtonLabel color="$putih">
                      {logoutAll.isPending ? 'Memproses...' : 'Ya, Keluar'}
                    </ButtonLabel>
                  </PrimaryButton>
                  <SecondaryButton flex={1} onPress={() => setConfirmLogoutAll(false)}>
                    <ButtonLabel color="$tinta">Batal</ButtonLabel>
                  </SecondaryButton>
                </XStack>
              </YStack>
            ) : (
              <InlineAction
                color="$peringatan"
                textDecorationLine="underline"
                onPress={() => setConfirmLogoutAll(true)}
              >
                Keluar dari semua perangkat
              </InlineAction>
            )}
          </YStack>

          <YStack gap="$2">
            <SectionHeading>Data</SectionHeading>
            <InlineAction
              onPress={() => exportData.mutate()}
              opacity={exportData.isPending ? 0.5 : 1}
            >
              {exportData.isPending ? 'Menyiapkan ekspor...' : 'Ekspor data saya ›'}
            </InlineAction>
            {exportData.isSuccess ? (
              <Meta>Permintaan ekspor terkirim. File akan dikirim ke emailmu.</Meta>
            ) : exportData.isError ? (
              <Meta color="$peringatan">Gagal mengekspor data. Coba lagi.</Meta>
            ) : null}
          </YStack>

          <YStack gap="$3">
            <SectionHeading color="$peringatan">Zona bahaya</SectionHeading>
            <YStack
              borderWidth={1.5}
              borderColor="$peringatan"
              backgroundColor="$peringatanFillSoft"
              borderRadius={8}
              padding="$4"
              gap="$3"
            >
              <Body>
                Menghapus akun akan menghapus seluruh riwayat transaksi, anggaran, dan target
                tabunganmu secara permanen.
              </Body>
              <PrimaryButton backgroundColor="$peringatan" disabled opacity={0.4}>
                <ButtonLabel color="$putih">Hapus akun</ButtonLabel>
              </PrimaryButton>
              <Meta>Segera hadir.</Meta>
            </YStack>
          </YStack>
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
