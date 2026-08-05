import { Input, type InputProps } from 'tamagui'
import { formatRupiah, parseRupiahInput } from '../format/money'

interface RupiahInputProps extends Omit<InputProps, 'value' | 'onChangeText'> {
  value: number
  onChangeValue: (minorUnits: number) => void
}

export function RupiahInput({ value, onChangeValue, ...rest }: RupiahInputProps) {
  return (
    <Input
      keyboardType="numeric"
      value={value === 0 ? '' : formatRupiah(value).replace('Rp', '')}
      onChangeText={(text) => onChangeValue(parseRupiahInput(text))}
      placeholder="0"
      color="$color"
      focusStyle={{ borderColor: '$borderColorFocus' }}
      {...rest}
    />
  )
}
