import type { ReactNode } from 'react'
import { Label, styled, Text, XStack, YStack, View } from 'tamagui'
import { scaleForTablet } from '../theme/responsive'

/**
 * The whole type system, as components. Nothing in a screen should set fontFamily,
 * fontSize or fontWeight by hand — if a size is missing here, it is missing from the
 * design, and that is worth a question rather than an invention.
 *
 * Names map 1:1 to the table in design_handoff_sakuplan_rn/DESIGN_TOKENS.md.
 *
 * Every fontSize/lineHeight pair also carries a $gtSm (>=768px, tablet) override via
 * scaleForTablet() — see docs/superpowers/specs/2026-08-18-responsive-tablet-typography-design.md.
 */

// --- Fraunces. Wordmark and onboarding/auth headings only. ---

export const Wordmark = styled(Text, {
  fontFamily: '$heading',
  fontWeight: '600',
  color: '$terjaga',
  variants: {
    size: {
      s: {
        fontSize: 20,
        lineHeight: 26,
        $gtSm: { fontSize: scaleForTablet(20), lineHeight: scaleForTablet(26) },
      }, // home
      m: {
        fontSize: 22,
        lineHeight: 28,
        $gtSm: { fontSize: scaleForTablet(22), lineHeight: scaleForTablet(28) },
      }, // onboarding
      l: {
        fontSize: 24,
        lineHeight: 30,
        $gtSm: { fontSize: scaleForTablet(24), lineHeight: scaleForTablet(30) },
      }, // auth
    },
  } as const,
  defaultVariants: { size: 's' },
})

export const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontWeight: '600',
  fontSize: 24,
  lineHeight: 30,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(24), lineHeight: scaleForTablet(30) },
})

export const AuthHeading = styled(Text, {
  fontFamily: '$heading',
  fontWeight: '600',
  fontSize: 20,
  lineHeight: 26,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(20), lineHeight: scaleForTablet(26) },
})

// --- IBM Plex Sans. Everything else. ---

/** Tab screen title. 24/32 SemiBold, left-aligned. */
export const TabTitle = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 24,
  lineHeight: 32,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(24), lineHeight: scaleForTablet(32) },
})

/** Detail screen title. 18/24 SemiBold, one line. */
export const DetailTitle = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 18,
  lineHeight: 24,
  color: '$tinta',
  numberOfLines: 1,
  ellipsizeMode: 'tail',
  $gtSm: { fontSize: scaleForTablet(18), lineHeight: scaleForTablet(24) },
})

/** "Perlu perhatian", "Riwayat", "Identitas" … */
export const SectionHeading = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 14,
  lineHeight: 20,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(14), lineHeight: scaleForTablet(20) },
})

/** "Akun" / "Perencanaan" / "Aplikasi" group labels in Lainnya. */
export const GroupLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '500',
  fontSize: 11,
  lineHeight: 16,
  letterSpacing: 0.22,
  color: '$kulit',
  $gtSm: { fontSize: scaleForTablet(11), lineHeight: scaleForTablet(16) },
})

export const Body = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 14,
  lineHeight: 20,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(14), lineHeight: scaleForTablet(20) },
})

export const BodyS = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 13,
  lineHeight: 19,
  color: '$tinta',
  $gtSm: { fontSize: scaleForTablet(13), lineHeight: scaleForTablet(19) },
})

export const Meta = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 12,
  lineHeight: 17,
  color: '$kulit',
  $gtSm: { fontSize: scaleForTablet(12), lineHeight: scaleForTablet(17) },
})

export const MetaS = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 11,
  lineHeight: 16,
  color: '$kulit',
  $gtSm: { fontSize: scaleForTablet(11), lineHeight: scaleForTablet(16) },
})

/** 10px, tracked out. Chart labels and the "SARAN AI · …" eyebrow. */
export const Micro = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 10,
  lineHeight: 14,
  letterSpacing: 0.4,
  color: '$kulit',
  $gtSm: { fontSize: scaleForTablet(10), lineHeight: scaleForTablet(14) },
})

// --- IBM Plex Mono. Numbers and field labels. ---

/**
 * Every currency figure. `tabular` is on by default and must stay on — it is what
 * keeps the ledger columns from shifting as digits change. Pass already-formatted
 * text (via `formatRupiah` from `src/format/money.ts`) as children — this component
 * does not format numbers itself.
 */
export const Amount = styled(Text, {
  fontFamily: '$mono',
  fontWeight: '500',
  color: '$tinta',
  fontVariant: ['tabular-nums'],
  variants: {
    size: {
      12: {
        fontSize: 12,
        lineHeight: 16,
        $gtSm: { fontSize: scaleForTablet(12), lineHeight: scaleForTablet(16) },
      },
      13: {
        fontSize: 13,
        lineHeight: 17,
        $gtSm: { fontSize: scaleForTablet(13), lineHeight: scaleForTablet(17) },
      },
      14: {
        fontSize: 14,
        lineHeight: 18,
        $gtSm: { fontSize: scaleForTablet(14), lineHeight: scaleForTablet(18) },
      },
      15: {
        fontSize: 15,
        lineHeight: 20,
        $gtSm: { fontSize: scaleForTablet(15), lineHeight: scaleForTablet(20) },
      },
      16: {
        fontSize: 16,
        lineHeight: 21,
        $gtSm: { fontSize: scaleForTablet(16), lineHeight: scaleForTablet(21) },
      },
      17: {
        fontSize: 17,
        lineHeight: 22,
        $gtSm: { fontSize: scaleForTablet(17), lineHeight: scaleForTablet(22) },
      },
      26: {
        fontSize: 26,
        lineHeight: 30,
        $gtSm: { fontSize: scaleForTablet(26), lineHeight: scaleForTablet(30) },
      },
      28: {
        fontSize: 28,
        lineHeight: 32,
        $gtSm: { fontSize: scaleForTablet(28), lineHeight: scaleForTablet(32) },
      },
      36: {
        fontSize: 36,
        lineHeight: 40,
        $gtSm: { fontSize: scaleForTablet(36), lineHeight: scaleForTablet(40) },
      },
      42: {
        fontSize: 42,
        lineHeight: 46,
        $gtSm: { fontSize: scaleForTablet(42), lineHeight: scaleForTablet(46) },
      }, // home hero: line-height 1.1
    },
  } as const,
  defaultVariants: { size: 14 },
})

/**
 * Icon + uppercase mono form label on one row, with `htmlFor` wired to the
 * paired input's `id`. The `styled(Text)` route can't take `htmlFor` — this
 * is a plain component built on Tamagui's `Label` for that reason, so its
 * tablet override is an inline `$gtSm` prop rather than a styled() config key.
 */
export function FieldLabel({
  htmlFor,
  icon,
  children,
}: {
  htmlFor: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <XStack alignItems="center" gap="$2">
      {icon}
      <Label
        htmlFor={htmlFor}
        fontFamily="$mono"
        fontWeight="500"
        fontSize={11}
        lineHeight={15}
        letterSpacing={0.44}
        color="$kulit"
        $gtSm={{ fontSize: scaleForTablet(11), lineHeight: scaleForTablet(15) }}
      >
        {children}
      </Label>
    </XStack>
  )
}

// --- Layout ---

/** Main-app screen body. 20px gutters, 20 top, 28 bottom; 24/24/32 on tablet. */
export const Screen = styled(YStack, {
  flex: 1,
  backgroundColor: '$kertas',
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 28,
  $gtSm: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
})

/** Onboarding and auth use wider gutters; wider still on tablet. */
export const FlowScreen = styled(YStack, {
  flex: 1,
  backgroundColor: '$kertas',
  paddingHorizontal: 24,
  paddingBottom: 24,
  $gtSm: { paddingHorizontal: 32, paddingBottom: 32 },
})

/** 1px horizontal rule. Applied as the TOP border of each list row. */
export const Hairline = styled(View, {
  height: 1,
  backgroundColor: '$hairline',
  alignSelf: 'stretch',
})

/**
 * A ledger row: full-width, space-between, hairline on top.
 * `pv` matches the design's per-list padding (9 / 12 / 13 / 14); +3px on tablet,
 * whatever value the caller passes.
 */
export const LedgerRow = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  borderTopWidth: 1,
  borderTopColor: '$hairline',
  variants: {
    pv: {
      ':number': (n) => ({ paddingVertical: n, $gtSm: { paddingVertical: n + 3 } }),
    },
  } as const,
  defaultVariants: { pv: 13 },
})

/** Solid-border input. The default everywhere except onboarding. */
export const inputStyle = {
  borderWidth: 1.5,
  borderColor: '$kulit',
  borderRadius: 8,
  backgroundColor: '$putih',
  paddingHorizontal: 14,
  paddingVertical: 13,
  fontFamily: '$body',
  fontSize: 14,
  color: '$tinta',
  $gtSm: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: scaleForTablet(14),
  },
} as const

/**
 * Compact inline-edit input. Used where a numeric field sits directly inside
 * a list row (Anggaran's "Ubah" editor) rather than a form — thinner border,
 * smaller radius/padding/type than `inputStyle`.
 */
export const compactInputStyle = {
  borderWidth: 1,
  borderColor: '$kulit',
  borderRadius: 6,
  backgroundColor: '$putih',
  paddingHorizontal: 9,
  paddingVertical: 9,
  fontFamily: '$mono',
  fontWeight: '500',
  fontSize: 13,
  color: '$tinta',
} as const

/** Focus treatment: border goes brand green, plus a 3px soft ring. */
export const inputFocusStyle = {
  borderColor: '$terjaga',
  shadowColor: 'rgba(0,107,94,0.15)',
  shadowRadius: 0,
  shadowOpacity: 1,
  shadowOffset: { width: 0, height: 0 },
  // RN has no spread-only shadow; on native, emulate the ring with an outline View
  // or accept the border-only focus. Do not fake it with elevation.
} as const

/** Primary action. Full-width brand green. */
export const PrimaryButton = styled(XStack, {
  role: 'button',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '$terjaga',
  borderRadius: 8,
  paddingVertical: 15,
  pressStyle: { scale: 0.97 },
  transition: 'quick',
  $gtSm: { paddingVertical: 18 },
})

/** Secondary action. Outlined, transparent fill. */
export const SecondaryButton = styled(XStack, {
  role: 'button',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderWidth: 1.5,
  borderColor: '$kulit',
  borderRadius: 8,
  backgroundColor: 'transparent',
  paddingVertical: 15,
  pressStyle: { scale: 0.97 },
  transition: 'quick',
  $gtSm: { paddingVertical: 18 },
})

export const ButtonLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '500',
  fontSize: 14,
  lineHeight: 20,
  $gtSm: { fontSize: scaleForTablet(14), lineHeight: scaleForTablet(20) },
})

/** Small inline text action: "Ubah", "Tandai lunas", "Lihat anggaran". */
export const InlineAction = styled(Text, {
  fontFamily: '$body',
  fontWeight: '500',
  fontSize: 12,
  lineHeight: 16,
  color: '$terjaga',
  pressStyle: { opacity: 0.7 },
  $gtSm: { fontSize: scaleForTablet(12), lineHeight: scaleForTablet(16) },
})

/**
 * Selection chip. 32px tall by design — below the 44px minimum, so callers MUST pass
 * hitSlop to the pressable wrapper. Keep the visual size; expand only the touch area.
 * A bit taller/wider on tablet (36 / 16 / 10).
 */
export const Chip = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 32,
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 14,
  borderWidth: 1,
  pressStyle: { scale: 0.95 },
  transition: 'quick',
  $gtSm: { minHeight: 36, paddingHorizontal: 16, paddingVertical: 10 },
  variants: {
    selected: {
      true: { backgroundColor: '$terjaga', borderColor: '$terjaga' },
      false: { backgroundColor: '$putih', borderColor: '$kulit' },
    },
  } as const,
  defaultVariants: { selected: false },
})

export const ChipLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '400',
  fontSize: 12,
  lineHeight: 16,
  $gtSm: { fontSize: scaleForTablet(12), lineHeight: scaleForTablet(16) },
  variants: {
    selected: {
      true: { color: '$putih' },
      false: { color: '$tinta' },
    },
  } as const,
  defaultVariants: { selected: false },
})

/**
 * Type segmented control (Transaksi). Distinct from `Chip`: radius 6 not 14,
 * no border, kertas (not white) unselected fill, Plex Sans 500 · 13 not 400 · 12.
 */
export const SegmentButton = styled(XStack, {
  role: 'button',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  borderRadius: 6,
  paddingVertical: 10,
  pressStyle: { scale: 0.97 },
  transition: 'quick',
  variants: {
    selected: {
      true: { backgroundColor: '$terjaga' },
      false: { backgroundColor: '$kertas' },
    },
  } as const,
  defaultVariants: { selected: false },
})

/**
 * AI-consent style toggle. 44×26 track, radius 13, terjaga when on /
 * kulitTrack when off; 20px white knob, 3px inset, 150ms slide.
 */
export function Toggle({
  value,
  onValueChange,
}: {
  value: boolean
  onValueChange: (next: boolean) => void
}) {
  return (
    <XStack
      width={44}
      height={26}
      borderRadius={13}
      padding={3}
      backgroundColor={value ? '$terjaga' : '$kulitTrack'}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View
        width={20}
        height={20}
        borderRadius={10}
        backgroundColor="$putih"
        marginLeft={value ? 18 : 0}
      />
    </XStack>
  )
}

export const SegmentLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '500',
  fontSize: 13,
  lineHeight: 18,
  $gtSm: { fontSize: scaleForTablet(13), lineHeight: scaleForTablet(18) },
  variants: {
    selected: {
      true: { color: '$putih' },
      false: { color: '$tinta' },
    },
  } as const,
  defaultVariants: { selected: false },
})
