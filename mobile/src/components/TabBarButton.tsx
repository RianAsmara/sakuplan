import type { GestureResponderEvent } from 'react-native'
import type { PropsWithChildren } from 'react'
import { Button, Text } from 'tamagui'

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
  const color = active ? '$terjaga' : '$kulit'

  return (
    <Button
      unstyled
      flex={1}
      alignItems="center"
      paddingTop={14}
      paddingBottom={12}
      borderTopWidth={2}
      borderTopColor={color}
      onPress={onPress}
    >
      <Text style={{ fontFamily: 'Inter_500Medium' }} fontSize={11} color={color}>
        {label}
      </Text>
    </Button>
  )
}
