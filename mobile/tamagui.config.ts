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

// Derives a lighter/darker shade of a hex color. Positive `amount` lightens
// (mixes toward white), negative darkens (mixes toward black) — used to
// generate hover/press/focus state colors from the named palette above
// without hand-picking a second hex value for every interaction state.
function shade(hex: string, amount: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n))
  const num = Number.parseInt(hex.slice(1), 16)
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  const mix = (channel: number) =>
    amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount)
  const toHex = (n: number) => clamp(Math.round(mix(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const tokens = createTokens({
  color,
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, true: 16 },
  size: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, true: 16 },
  radius: { 0: 0, 1: 4, 2: 8, 3: 12, true: 8 },
  zIndex: { 0: 0, 1: 100, 2: 200, true: 0 },
})

const headingFont = createFont({
  family: 'Inter_700Bold',
  size: { 1: 14, 2: 16, 3: 20, 4: 24, 5: 32, 6: 40, true: 20 },
  weight: { 1: '400', 2: '700', true: '700' },
  lineHeight: { 1: 18, 2: 22, 3: 26, 4: 30, 5: 40, 6: 48, true: 26 },
})

const bodyFont = createFont({
  family: 'Inter_400Regular',
  size: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 24, true: 16 },
  weight: { 1: '400', 2: '500', true: '400' },
  lineHeight: { 1: 16, 2: 20, 3: 24, 4: 26, 5: 30, 6: 34, true: 24 },
})

const monoFont = createFont({
  family: 'Inter_500Medium',
  size: { 1: 14, 2: 16, 3: 20, 4: 28, 5: 32, 6: 40, true: 16 },
  weight: { 1: '500', true: '500' },
  lineHeight: { 1: 18, 2: 22, 3: 26, 4: 34, 5: 40, 6: 48, true: 22 },
})

const lightTheme = {
  // Base surface + text
  background: tokens.color.kertas,
  backgroundHover: shade(color.kertas, -0.03),
  backgroundPress: shade(color.kertas, -0.06),
  backgroundFocus: shade(color.kertas, -0.03),
  color: tokens.color.tinta,
  colorHover: tokens.color.tinta,
  colorPress: tokens.color.tinta,
  colorFocus: tokens.color.tinta,
  placeholderColor: shade(color.kulit, 0.15),
  outlineColor: shade(color.terjaga, 0.35),

  // Borders — default kulit (leather), focus shifts to the brand teal so a
  // focused field is unmistakable without needing a color-coded label.
  borderColor: tokens.color.kulit,
  borderColorHover: shade(color.kulit, -0.1),
  borderColorPress: tokens.color.terjaga,
  borderColorFocus: tokens.color.terjaga,

  // Primary action (buttons, links)
  primary: tokens.color.terjaga,
  primaryHover: shade(color.terjaga, 0.08),
  primaryPress: shade(color.terjaga, -0.12),
  primaryFocus: shade(color.terjaga, 0.08),
  primaryText: tokens.color.white,

  // Secondary text/hairlines
  accent: tokens.color.leluasa,
  kulit: tokens.color.kulit,

  // Error state
  danger: tokens.color.peringatan,
  dangerHover: shade(color.peringatan, 0.08),
  dangerPress: shade(color.peringatan, -0.12),

  white: tokens.color.white,
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
