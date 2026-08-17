import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Home, ReceiptText, Wallet, BarChart3, MoreHorizontal } from '@tamagui/lucide-icons-2'
import { Text, XStack, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DashedRule } from './DashedBox'

/**
 * Custom tab bar. A stock tab bar cannot express this design, because the active
 * indicator is a 2px rule on the TOP EDGE of the tab item — and inactive items carry
 * the same 2px rule in kulit, so the bar reads as a segmented ledger line rather than
 * as a highlighted pill. That segmented line is the point. Do not replace it with a
 * background or an underline.
 */

const ICONS = {
  home: Home,
  transactions: ReceiptText,
  budgets: Wallet,
  reports: BarChart3,
  more: MoreHorizontal,
} as const

const LABELS = {
  home: 'Beranda',
  transactions: 'Transaksi',
  budgets: 'Anggaran',
  reports: 'Laporan',
  more: 'Lainnya',
} as const

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <YStack backgroundColor="$putih" flexShrink={0}>
      <DashedRule color="#AEB9B2" strokeWidth={1.5} />
      <XStack paddingBottom={insets.bottom}>
        {state.routes.map((route, index) => {
          const focused = state.index === index
          const key = route.name as keyof typeof ICONS
          const Icon = ICONS[key]
          const color = focused ? '$terjaga' : '$kulit'

          return (
            <YStack
              key={route.key}
              flex={1}
              alignItems="center"
              gap={3}
              paddingTop={14}
              paddingBottom={12}
              paddingHorizontal={4}
              borderTopWidth={2}
              borderTopColor={color}
              pressStyle={{ scale: 0.95 }}
              transition="quick"
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
              }}
            >
              {Icon ? <Icon size={18} color={color} strokeWidth={2} /> : null}
              <Text
                fontFamily="$body"
                fontWeight="500"
                fontSize={11}
                lineHeight={16}
                color={color}
              >
                {LABELS[key]}
              </Text>
            </YStack>
          )
        })}
      </XStack>
    </YStack>
  )
}
