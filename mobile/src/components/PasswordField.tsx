import { useState } from 'react'
import { Eye, EyeOff } from '@tamagui/lucide-icons-2'
import { XStack, type InputProps } from 'tamagui'
import { TextField } from './TextField'

/**
 * A password TextField with a show/hide toggle. The toggle button is a full
 * 44x44 touch target (this project's minimum) even though the Eye/EyeOff
 * glyph itself is smaller, matching how the chip/avatar touch targets are
 * expanded elsewhere without changing their visual size.
 */
export function PasswordField(props: InputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <XStack position="relative" alignItems="center" width="100%">
      <TextField {...props} secureTextEntry={!visible} flex={1} paddingRight={44} />
      <XStack
        position="absolute"
        right={0}
        top={0}
        bottom={0}
        width={44}
        alignItems="center"
        justifyContent="center"
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
      >
        {visible ? <EyeOff size={18} color="$kulit" /> : <Eye size={18} color="$kulit" />}
      </XStack>
    </XStack>
  )
}
