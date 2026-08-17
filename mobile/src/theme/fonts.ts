import { useFonts } from 'expo-font'
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces'
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans'
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono'

export function useAppFontsLoaded(): boolean {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_500Medium,
  })
  return fontsLoaded
}
