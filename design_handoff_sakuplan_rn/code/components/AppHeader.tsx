import { router } from 'expo-router'
import { ArrowLeft } from '@tamagui/lucide-icons'
import { XStack, YStack, View } from 'tamagui'
import { DetailTitle, TabTitle, Meta } from './primitives'

/**
 * DetailHeader — the header for the 8 sub-screens.
 *
 * 56px bar, kertas background, 1px hairline underneath, icon-only back button.
 * There is no text label next to the arrow; that was removed deliberately.
 * The bar bleeds to the screen edges, so it must sit OUTSIDE the 20px-gutter Screen body.
 */
export function DetailHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <XStack
      height={56}
      alignItems="center"
      paddingHorizontal={16}
      backgroundColor="$kertas"
      borderBottomWidth={1}
      borderBottomColor="$hairline"
    >
      <XStack
        width={44}
        height={44}
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        borderRadius={8}
        pressStyle={{ backgroundColor: '$tekan' }}
        animation="quick"
        onPress={onBack ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel="Kembali"
      >
        <ArrowLeft size={21} color="$terjaga" strokeWidth={2} />
      </XStack>
      <DetailTitle flex={1} marginLeft={8}>
        {title}
      </DetailTitle>
    </XStack>
  )
}

/**
 * TabHeader — the header for Transaksi / Anggaran / Laporan / Lainnya.
 *
 * No back button, no card, no border, no icon. Just a 24/32 SemiBold title, an optional
 * description line, and an optional compact action pinned to the right.
 * Beranda does not use this — it opens with its own brand row.
 */
export function TabHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <XStack justifyContent="space-between" alignItems="flex-start" marginBottom={22}>
      <YStack flex={1}>
        <TabTitle>{title}</TabTitle>
        {description ? <Meta marginTop={5}>{description}</Meta> : null}
      </YStack>
      {action ? <View marginTop={6}>{action}</View> : null}
    </XStack>
  )
}
