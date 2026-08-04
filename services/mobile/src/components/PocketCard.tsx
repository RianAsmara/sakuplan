import { styled, YStack } from 'tamagui'

export const PocketCard = styled(YStack, {
  name: 'PocketCard',
  backgroundColor: '$background',
  borderTopWidth: 1,
  borderTopColor: '$borderColor',
  borderStyle: 'dashed',
  borderRadius: '$3',
  padding: '$5',
  gap: '$4',
  width: '100%',
  maxWidth: 440,
  alignSelf: 'center',
})
