import { View, XStack } from 'tamagui'

/**
 * Progress bars. Three appear in the design and they differ in ways that matter:
 *
 *  - Budgets (Anggaran):  5px, fill terjaga or peringatan when over, width clamped to 100.
 *  - Goals (Home + Target tabungan): 6px, fill leluasa, PLUS a 2px white dashed tick on
 *    the fill's right edge. That tick is not decoration — it is what makes a savings
 *    bar read differently from a spending bar at a glance.
 *  - Report categories: 6px, fill terjaga, normalized against the largest category.
 */

export function ProgressBar({
  pct,
  height = 6,
  fill,
  track = '$kertas',
  tick = false,
}: {
  /** 0–100. Clamp before passing; this component does not clamp for you. */
  pct: number
  height?: number
  fill: string
  track?: string
  /** The 2px white dashed right edge used by savings goals. */
  tick?: boolean
}) {
  return (
    <View
      height={height}
      borderRadius={3}
      backgroundColor={track}
      overflow="hidden"
      alignSelf="stretch"
    >
      <XStack width={`${pct}%`} height="100%" backgroundColor={fill} justifyContent="flex-end">
        {tick && pct > 0 ? <View width={2} height="100%" backgroundColor="$putih" /> : null}
      </XStack>
    </View>
  )
}
