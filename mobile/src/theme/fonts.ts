import {
  useFonts as useFraunces,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces'
import {
  useFonts as usePlexSans,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans'
import {
  useFonts as usePlexMono,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono'

export function useAppFontsLoaded(): boolean {
  const [frauncesLoaded] = useFraunces({ Fraunces_600SemiBold })
  const [plexSansLoaded] = usePlexSans({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  })
  const [plexMonoLoaded] = usePlexMono({ IBMPlexMono_500Medium })
  return frauncesLoaded && plexSansLoaded && plexMonoLoaded
}
