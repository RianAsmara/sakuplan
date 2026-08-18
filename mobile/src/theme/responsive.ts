/**
 * Uniform scale-up factor for tablet ($gtSm) typography. No tablet mockup
 * exists to match pixel-for-pixel (design_handoff_sakuplan_rn's reference is
 * phone-width only), so this is a single deliberate constant rather than
 * per-component hand-picked values — see
 * docs/superpowers/specs/2026-08-18-responsive-tablet-typography-design.md.
 */
const TABLET_TYPE_SCALE = 1.15

/** Scales a phone-baseline fontSize or lineHeight pixel value for tablet. */
export function scaleForTablet(px: number): number {
  return Math.round(px * TABLET_TYPE_SCALE)
}
