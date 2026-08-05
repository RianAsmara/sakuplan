import { Redirect } from 'expo-router'
import { Spinner, YStack } from 'tamagui'
import { useAuthStore } from '../src/auth/store'
import { useHydrateSession } from '../src/auth/useHydrateSession'

export default function Index() {
  useHydrateSession()
  const isHydrating = useAuthStore((state) => state.isHydrating)
  const accessToken = useAuthStore((state) => state.accessToken)

  if (isHydrating) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    )
  }
  return <Redirect href={accessToken ? '/(app)/(tabs)/home' : '/(auth)/login'} />
}
