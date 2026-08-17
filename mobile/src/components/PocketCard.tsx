import type { ReactNode } from 'react'
import { YStack, type YStackProps } from 'tamagui'
import { DashedBox } from './DashedBox'

type PocketCardProps = YStackProps & {
  children?: ReactNode
  elevated?: boolean
  tone?: 'muted'
}

export function PocketCard({ children, elevated = false, tone, ...rest }: PocketCardProps) {
  const isMuted = tone === 'muted'
  return (
    <YStack width="100%" maxWidth={440} alignSelf="center" {...rest}>
      <DashedBox
        color="#AEB9B2"
        fill={isMuted ? 'transparent' : '#FFFFFF'}
        radius={elevated ? 12 : 8}
        style={{ alignSelf: 'stretch', width: '100%', flexGrow: 1 }}
      >
        <YStack
          backgroundColor="transparent"
          padding={elevated ? '$5' : '$4'}
          gap={elevated ? '$4' : '$3'}
          shadowColor={elevated && !isMuted ? '$tinta' : undefined}
          shadowOffset={elevated && !isMuted ? { width: 0, height: 6 } : undefined}
          shadowOpacity={elevated ? (isMuted ? 0 : 0.1) : undefined}
          shadowRadius={elevated && !isMuted ? 20 : undefined}
          elevation={elevated ? (isMuted ? 0 : 4) : undefined}
          {...rest}
        >
          {children}
        </YStack>
      </DashedBox>
    </YStack>
  )
}
