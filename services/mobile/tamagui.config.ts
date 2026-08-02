import { createAnimations } from '@tamagui/animations-react-native'
import { createFont, createTamagui, createTokens } from 'tamagui'

const color = {
  kertas: '#F5F6F3',
  tinta: '#1E2A22',
  terjaga: '#0E6B58',
  leluasa: '#C9A227',
  kulit: '#7C6A5B',
  peringatan: '#B23B33',
  white: '#FFFFFF',
}

const tokens = createTokens({
  color,
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, true: 16 },
  size: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, true: 16 },
  radius: { 0: 0, 1: 4, 2: 8, 3: 12, true: 8 },
  zIndex: { 0: 0, 1: 100, 2: 200, true: 0 },
})

const headingFont = createFont({
  family: 'Fraunces_600SemiBold',
  size: { 1: 14, 2: 16, 3: 20, 4: 24, 5: 32, 6: 40, true: 20 },
  weight: { 1: '400', 2: '600', true: '600' },
  lineHeight: { 1: 18, 2: 22, 3: 26, 4: 30, 5: 40, 6: 48, true: 26 },
})

const bodyFont = createFont({
  family: 'IBMPlexSans_400Regular',
  size: { 1: 12, 2: 14, 3: 16, 4: 18, true: 16 },
  weight: { 1: '400', 2: '500', true: '400' },
  lineHeight: { 1: 16, 2: 20, 3: 24, 4: 26, true: 24 },
})

const monoFont = createFont({
  family: 'IBMPlexMono_500Medium',
  size: { 1: 14, 2: 16, 3: 20, 4: 28, true: 16 },
  weight: { 1: '500', true: '500' },
  lineHeight: { 1: 18, 2: 22, 3: 26, 4: 34, true: 22 },
})

const lightTheme = {
  background: tokens.color.kertas,
  color: tokens.color.tinta,
  primary: tokens.color.terjaga,
  primaryText: tokens.color.white,
  accent: tokens.color.leluasa,
  borderColor: tokens.color.kulit,
  danger: tokens.color.peringatan,
}

export const config = createTamagui({
  animations: createAnimations({
    fast: { type: 'timing', duration: 120 },
    medium: { type: 'timing', duration: 200 },
  }),
  defaultFont: 'body',
  fonts: { heading: headingFont, body: bodyFont, mono: monoFont },
  tokens,
  themes: { light: lightTheme },
})

export type AppConfig = typeof config

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
