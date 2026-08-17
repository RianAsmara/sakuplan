import { createFont, createTamagui, createTokens } from '@tamagui/core'
import { shorthands } from '@tamagui/shorthands'
import { animations } from '@tamagui/animations-react-native'

/**
 * SakuPlan design tokens.
 * Values are lifted verbatim from the HTML prototype — see DESIGN_TOKENS.md.
 * Do not "clean up" or re-derive any of these numbers.
 */
export const tokens = createTokens({
  color: {
    terjaga: '#006B5E',
    tinta: '#18251F',
    kertas: '#F7F8F4',
    kulit: '#66736C',
    leluasa: '#D2A21B',
    peringatan: '#C3443D',
    putih: '#FFFFFF',
    hairline: '#D8DDD7',
    garisPutus: '#AEB9B2',
    tekan: '#EEF3EF',

    // Alpha fills — used literally by the design.
    terjagaFill: 'rgba(0,107,94,0.06)',
    terjagaRing: 'rgba(0,107,94,0.15)',
    peringatanFill: 'rgba(195,68,61,0.06)',
    peringatanFillSoft: 'rgba(195,68,61,0.05)',
    peringatanFillFaint: 'rgba(195,68,61,0.04)',
    peringatanRule: 'rgba(195,68,61,0.12)',
    leluasaFill: 'rgba(210,162,27,0.05)',
    leluasaRule: 'rgba(210,162,27,0.18)',
    kulitTrack: 'rgba(102,115,108,0.35)',
    transparent: 'transparent',
  },
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
  zIndex: { 0: 0, 1: 100, 2: 200 },
})

/** Fraunces 600 — wordmark, onboarding headings, auth headings. Nothing else. */
const displayFont = createFont({
  family: 'Fraunces_600SemiBold',
  size: { 4: 20, 5: 22, 6: 24, true: 24 },
  lineHeight: { 4: 26, 5: 28, 6: 30, true: 30 },
  weight: { 6: '600' },
  letterSpacing: { 6: 0 },
  face: { '600': { normal: 'Fraunces_600SemiBold' } },
})

/** IBM Plex Sans — all UI text. */
const bodyFont = createFont({
  family: 'IBMPlexSans_400Regular',
  size: { 1: 10, 2: 11, 3: 12, 4: 13, 5: 14, 6: 18, 7: 24, true: 14 },
  lineHeight: { 1: 14, 2: 16, 3: 17, 4: 19, 5: 20, 6: 24, 7: 32, true: 20 },
  weight: { 4: '400', 5: '500', 6: '600' },
  letterSpacing: { 1: 0.4, 2: 0.22, true: 0 },
  face: {
    '400': { normal: 'IBMPlexSans_400Regular' },
    '500': { normal: 'IBMPlexSans_500Medium' },
    '600': { normal: 'IBMPlexSans_600SemiBold' },
  },
})

/** IBM Plex Mono 500 — every number, every amount, every field label. */
const monoFont = createFont({
  family: 'IBMPlexMono_500Medium',
  size: { 2: 11, 4: 13, 5: 14, 6: 15, 7: 16, 8: 17, 9: 26, 10: 28, 11: 36, 12: 42, true: 14 },
  lineHeight: { 2: 15, 4: 17, 5: 18, 6: 20, 7: 21, 8: 22, 9: 30, 10: 32, 11: 40, 12: 46, true: 18 },
  weight: { 5: '500' },
  letterSpacing: { 2: 0.44, true: 0 },
  face: { '500': { normal: 'IBMPlexMono_500Medium' } },
})

export const config = createTamagui({
  tokens,
  shorthands,
  animations,
  fonts: { display: displayFont, body: bodyFont, mono: monoFont },
  themes: {
    light: {
      background: tokens.color.kertas,
      surface: tokens.color.putih,
      color: tokens.color.tinta,
      colorSecondary: tokens.color.kulit,
      accent: tokens.color.terjaga,
      warn: tokens.color.leluasa,
      danger: tokens.color.peringatan,
      borderColor: tokens.color.hairline,
    },
  },
  defaultTheme: 'light',
})

export type AppConfig = typeof config
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
