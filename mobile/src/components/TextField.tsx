import { Input, type InputProps } from 'tamagui'

// Tamagui's default (non-`unstyled`) styled pipeline for `Input` fails to
// paint typed text at all on this stack (react-native 0.86.2 + Fabric +
// tamagui 2.6.3) — confirmed by comparing against a bare react-native
// TextInput bound to the same state, which renders correctly. `unstyled`
// bypasses that broken pipeline; the props below reproduce the visual
// design the default pipeline was supposed to provide.
export function TextField(props: InputProps) {
  return (
    <Input
      unstyled
      color="$color"
      backgroundColor="$background"
      borderColor="$borderColor"
      borderWidth={1}
      borderRadius="$2"
      paddingHorizontal="$3"
      paddingVertical="$2"
      fontSize="$3"
      fontFamily="$body"
      focusStyle={{ borderColor: '$borderColorFocus' }}
      {...props}
    />
  )
}
