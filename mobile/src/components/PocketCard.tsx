import { styled, YStack } from 'tamagui'

export const PocketCard = styled(YStack, {
  name: 'PocketCard',
  backgroundColor: '$white',
  borderWidth: 1.5,
  borderColor: '$borderColor',
  borderStyle: 'dashed',
  borderRadius: '$2',
  padding: '$4',
  gap: '$3',
  width: '100%',
  maxWidth: 440,
  alignSelf: 'center',

  variants: {
    elevated: {
      true: {
        borderRadius: '$3',
        padding: '$5',
        gap: '$4',
        shadowColor: '$tinta',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 4,
      },
    },
    tone: {
      muted: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
      },
    },
  } as const,
})
