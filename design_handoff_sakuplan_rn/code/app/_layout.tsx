import { useFonts } from 'expo-font'
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces'
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans'
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono'
import { TamaguiProvider } from 'tamagui'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import config from '../tamagui.config'
import { AppProvider } from '../store/AppStore'

/**
 * Root layout. The three families must all be loaded before the first paint — the design
 * has no fallback stack, and Fraunces vs Plex Sans is a visible identity difference, not a
 * nicety. Render nothing until the fonts resolve.
 */
export default function RootLayout() {
  const [loaded] = useFonts({
    Fraunces_600SemiBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_500Medium,
  })

  if (!loaded) return null

  return (
    <TamaguiProvider config={config} defaultTheme="light">
      <SafeAreaProvider>
        <AppProvider>
          {/*
            Detail screens render their own DetailHeader (see components/AppHeader.tsx)
            because the design's bar bleeds edge-to-edge and carries a hairline, which the
            native header cannot reproduce exactly. So: headerShown false everywhere.
          */}
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F8F4' } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </TamaguiProvider>
  )
}
