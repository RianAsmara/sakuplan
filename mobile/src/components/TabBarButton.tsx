import { Pressable, Text, type GestureResponderEvent } from 'react-native'
import type { PropsWithChildren } from 'react'

interface TabBarButtonProps {
  accessibilityState?: { selected?: boolean }
  onPress?: (e: GestureResponderEvent) => void
  label: string
}

export function TabBarButton({
  accessibilityState,
  onPress,
  label,
}: PropsWithChildren<TabBarButtonProps>) {
  const active = accessibilityState?.selected ?? false
  const color = active ? '#0E6B58' : '#7C6A5B'

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingTop: 14,
        paddingBottom: 12,
        borderTopWidth: 2,
        borderTopColor: color,
      }}
    >
      <Text style={{ fontFamily: 'IBMPlexSans_500Medium', fontSize: 11, color }}>{label}</Text>
    </Pressable>
  )
}
