import type { ComponentType } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, YStack } from 'tamagui'
import { PocketCard } from './PocketCard'

interface ComingSoonScreenProps {
  title: string
  icon: ComponentType<{ size?: number; color?: string }>
}

export function ComingSoonScreen({ title, icon: Icon }: ComingSoonScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <YStack flex={1} backgroundColor="$background" padding="$5" gap="$5">
        <Text fontFamily="$heading" fontSize="$4" color="$color">
          {title}
        </Text>
        <PocketCard tone="muted" alignItems="center" justifyContent="center" flex={1} gap="$3">
          <Icon size={28} color="$kulit" />
          <Text fontFamily="$body" fontSize="$2" color="$kulit" textAlign="center">
            Fitur ini akan segera hadir.
          </Text>
        </PocketCard>
      </YStack>
    </SafeAreaView>
  )
}
