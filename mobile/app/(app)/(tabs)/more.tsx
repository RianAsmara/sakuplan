import type { ReactNode } from 'react'
import { useRouter } from 'expo-router'
import { ChevronRight, PiggyBank, ReceiptText, Shield, User, Wallet } from '@tamagui/lucide-icons-2'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, XStack, YStack } from 'tamagui'
import { TabHeader } from '../../../src/components/AppHeader'
import { Body, GroupLabel, Screen } from '../../../src/components/primitives'

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
      <XStack alignItems="center" gap="$2.5">
        {icon}
        <Body>{label}</Body>
      </XStack>
      <ChevronRight size={16} color="$kulit" />
    </XStack>
  )
}

export default function MoreScreen() {
  const router = useRouter()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$kertas">
        <Screen gap="$5">
          <TabHeader title="Lainnya" />

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
              icon={<ReceiptText size={16} color="$kulit" />}
              label="Tagihan berulang"
              onPress={() => router.push('/(app)/bills')}
            />
            <NavRow
              icon={<PiggyBank size={16} color="$kulit" />}
              label="Target tabungan"
              onPress={() => router.push('/(app)/goals')}
            />
            {/* Rekomendasi AI omitted — no AI backend exists yet. */}
          </YStack>

          <YStack>
            <GroupLabel marginBottom="$1">APLIKASI</GroupLabel>
            {/* Notifikasi omitted — NOTIF-001..004 have zero backend support. */}
            <NavRow
              icon={<Shield size={16} color="$kulit" />}
              label="Privasi & keamanan"
              onPress={() => router.push('/(app)/privacy')}
            />
          </YStack>
        </Screen>
      </ScrollView>
    </SafeAreaView>
  )
}
