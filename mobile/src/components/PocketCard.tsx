import type { ReactNode } from 'react'
import { YStack, type YStackProps } from 'tamagui'
import { DashedBox } from './DashedBox'

type PocketCardProps = YStackProps & {
  children?: ReactNode
  elevated?: boolean
  tone?: 'muted'
}

export function PocketCard({
  children,
  elevated = false,
  tone,
  flex,
  width,
  maxWidth,
  alignSelf,
  padding,
  gap,
  ...rest
}: PocketCardProps) {
  const isMuted = tone === 'muted'
  const phonePadding = elevated ? '$5' : '$4'
  const phoneGap = elevated ? '$4' : '$3'
  const tabletPadding = elevated ? '$6' : '$5'
  const tabletGap = elevated ? '$5' : '$4'
  return (
    <YStack
      width={width ?? '100%'}
      maxWidth={maxWidth ?? 440}
      alignSelf={alignSelf ?? 'center'}
      flex={flex}
      {...(maxWidth === undefined ? { $gtSm: { maxWidth: 600 } } : {})}
    >
      <DashedBox
        color="#AEB9B2"
        fill={isMuted ? 'transparent' : '#FFFFFF'}
        radius={elevated ? 12 : 8}
        style={{ alignSelf: 'stretch', width: '100%', flexGrow: 1 }}
      >
        <YStack
          backgroundColor="transparent"
          padding={padding ?? phonePadding}
          gap={gap ?? phoneGap}
          $gtSm={{
            ...((padding === undefined || padding === phonePadding)
              ? { padding: tabletPadding }
              : {}),
            ...((gap === undefined || gap === phoneGap) ? { gap: tabletGap } : {}),
          }}
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
