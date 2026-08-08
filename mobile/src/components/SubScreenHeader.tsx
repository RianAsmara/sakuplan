import { useRouter } from 'expo-router'
import { Button, Text, XStack } from 'tamagui'
import { ArrowLeft } from '@tamagui/lucide-icons-2'

export function SubScreenHeader({ title }: { title: string }) {
  const router = useRouter()
  return (
    <XStack
      alignItems="center"
      height={56}
      // Numeric, not the "$5" token: cancels out the parent screen's
      // YStack padding="$5" (= 24px, see tamagui.config.ts's `space` scale)
      // so this header spans full-bleed edge-to-edge, matching the
      // prototype's isSubScreen header exactly. Tamagui's margin props
      // don't reliably accept a "-$5" token string, so this uses the
      // token's known pixel value directly.
      marginHorizontal={-24}
      marginTop={-24}
      marginBottom="$3"
      paddingHorizontal="$3"
      backgroundColor="$background"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <Button
        size="$3"
        circular
        chromeless
        icon={<ArrowLeft size={21} color="$primary" />}
        onPress={() => router.back()}
        accessibilityLabel="Kembali"
      />
      <Text
        flex={1}
        fontFamily="$body"
        fontWeight="600"
        fontSize="$4"
        color="$color"
        numberOfLines={1}
        marginLeft="$2"
      >
        {title}
      </Text>
    </XStack>
  )
}
