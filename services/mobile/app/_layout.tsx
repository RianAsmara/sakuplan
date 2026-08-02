import { Slot } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { TamaguiProvider, Theme, YStack, Spinner } from 'tamagui'
import config from '../tamagui.config'
import { useAppFontsLoaded } from '../src/theme/fonts'

export default function RootLayout() {
  const fontsLoaded = useAppFontsLoaded()

  if (!fontsLoaded) {
    return (
      <TamaguiProvider config={config} defaultTheme="light">
        <Theme name="light">
          <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
            <Spinner size="large" color="$primary" />
          </YStack>
        </Theme>
      </TamaguiProvider>
    )
  }

  return (
    <TamaguiProvider config={config} defaultTheme="light">
      <Theme name="light">
        <StatusBar style="dark" />
        <Slot />
      </Theme>
    </TamaguiProvider>
  )
}
