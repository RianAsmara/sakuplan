import { createAnimations } from '@tamagui/animations-react-native'
import { createFont, createTamagui, createTokens } from 'tamagui'

const color = {
  kertas: '#F7F8F4',
  tinta: '#18251F',
  terjaga: '#006B5E',
  leluasa: '#D2A21B',
  kulit: '#66736C',
  peringatan: '#C3443D',
  white: '#FFFFFF',
  putih: '#FFFFFF',
  hairline: '#D8DDD7',
  garisPutus: '#AEB9B2',
  tekan: '#EEF3EF',
  terjagaFill: 'rgba(0,107,94,0.06)',
  terjagaRing: 'rgba(0,107,94,0.15)',
  peringatanFill: 'rgba(195,68,61,0.06)',
  peringatanFillSoft: 'rgba(195,68,61,0.05)',
  peringatanFillFaint: 'rgba(195,68,61,0.04)',
  peringatanRule: 'rgba(195,68,61,0.12)',
  leluasaFill: 'rgba(210,162,27,0.05)',
  leluasaRule: 'rgba(210,162,27,0.18)',
  kulitTrack: 'rgba(102,115,108,0.35)',
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
  space: {
    0: 0,
    0.5: 2,
    0.75: 3,
    1: 4,
    1.25: 5,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    4.5: 18,
    5: 20,
    5.5: 22,
    6: 24,
    6.5: 26,
    7: 28,
    8: 32,
    true: 16,
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    touch: 44,
    header: 56,
    avatar: 30,
    toggleW: 44,
    toggleH: 26,
    true: 16,
  },
  radius: {
    0: 0,
    1: 3,
    1.5: 4,
    2: 6,
    3: 8,
    4: 12,
    chip: 14,
    round: 999,
    true: 8,
  },
  zIndex: { 0: 0, 1: 100, 2: 200, true: 0 },
})

const headingFont = createFont({
  family: 'Fraunces_600SemiBold',
  size: { 4: 20, 5: 22, 6: 24, true: 24 },
  weight: { 6: '600' },
  lineHeight: { 4: 26, 5: 28, 6: 30, true: 30 },
  letterSpacing: { 6: 0 },
  face: { '600': { normal: 'Fraunces_600SemiBold' } },
})

const bodyFont = createFont({
  family: 'IBMPlexSans_400Regular',
  size: { 1: 10, 2: 11, 3: 12, 4: 13, 5: 14, 6: 18, 7: 24, true: 14 },
  weight: { 4: '400', 5: '500', 6: '600' },
  lineHeight: { 1: 14, 2: 16, 3: 17, 4: 19, 5: 20, 6: 24, 7: 32, true: 20 },
  letterSpacing: { 1: 0.4, 2: 0.22, true: 0 },
  face: {
    '400': { normal: 'IBMPlexSans_400Regular' },
    '500': { normal: 'IBMPlexSans_500Medium' },
    '600': { normal: 'IBMPlexSans_600SemiBold' },
  },
})

const monoFont = createFont({
  family: 'IBMPlexMono_500Medium',
  // Keys 1 and 3 are outside design_handoff_sakuplan_rn's scale (which starts at 2)
  // but are kept here at their pre-existing pixel values (14 and 20) because existing
  // screens - not touched by this plan - still reference $mono $1 and $3. Dropping
  // them would break those screens outright (undefined token), not just drift their
  // spacing the way the rest of this scale change does.
  size: {
    1: 14,
    2: 11,
    3: 20,
    4: 13,
    5: 14,
    6: 15,
    7: 16,
    8: 17,
    9: 26,
    10: 28,
    11: 36,
    12: 42,
    true: 14,
  },
  weight: { 5: '500' },
  lineHeight: {
    1: 18,
    2: 15,
    3: 26,
    4: 17,
    5: 18,
    6: 20,
    7: 21,
    8: 22,
    9: 30,
    10: 32,
    11: 40,
    12: 46,
    true: 18,
  },
  letterSpacing: { 2: 0.44, true: 0 },
  face: { '500': { normal: 'IBMPlexMono_500Medium' } },
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
    quick: { type: 'timing', duration: 120 },
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
