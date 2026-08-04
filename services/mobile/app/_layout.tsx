import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { TamaguiProvider, Theme, YStack, Spinner } from 'tamagui'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import tamaguiConfig from '../tamagui.config'
import { useAppFontsLoaded } from '../src/theme/fonts'

const queryClient = new QueryClient()

export default function RootLayout() {
  const fontsLoaded = useAppFontsLoaded()

  if (!fontsLoaded) {
    return (
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <Theme name="light">
          <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
            <Spinner size="large" color="$primary" />
          </YStack>
        </Theme>
      </TamaguiProvider>
    )
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <Theme name="light">
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Slot />
        </QueryClientProvider>
      </Theme>
    </TamaguiProvider>
  )
}
