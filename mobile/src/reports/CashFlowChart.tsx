import Svg, { Line, Polyline } from 'react-native-svg'
import { View, XStack } from 'tamagui'
import { Micro } from '../components/primitives'

/**
 * Hand-drawn SVG line chart per SCREENS.md §4 — not a chart library, so the
 * gridlines/scale/dash pattern match the design exactly. `stroke` needs a
 * literal color (SVG, not a Tamagui token) — same sanctioned exception as
 * DashedBox.
 */

const WIDTH = 380
const VIEWBOX_HEIGHT = 130
const RENDER_HEIGHT = 126
const GRIDLINE_Y = [20, 70, 120]
const TERJAGA = '#006B5E'
const PERINGATAN = '#C3443D'
const KERTAS = '#F7F8F4'

function scaleY(value: number, maxV: number): number {
  return VIEWBOX_HEIGHT - (value / maxV) * 110
}

function toPoints(values: number[], maxV: number): string {
  return values.map((value, index) => `${index * (WIDTH / 5)},${scaleY(value, maxV)}`).join(' ')
}

export function CashFlowChart({
  months,
  income,
  expenses,
}: {
  months: string[]
  income: number[]
  expenses: number[]
}) {
  const maxV = Math.max(1, ...income, ...expenses)

  return (
    <View>
      <Svg viewBox={`0 0 ${WIDTH} ${VIEWBOX_HEIGHT}`} width="100%" height={RENDER_HEIGHT}>
        {GRIDLINE_Y.map((y) => (
          <Line key={y} x1={0} y1={y} x2={WIDTH} y2={y} stroke={KERTAS} strokeWidth={1} />
        ))}
        <Polyline points={toPoints(income, maxV)} stroke={TERJAGA} strokeWidth={2} fill="none" />
        <Polyline
          points={toPoints(expenses, maxV)}
          stroke={PERINGATAN}
          strokeWidth={2}
          strokeDasharray="4 3"
          fill="none"
        />
      </Svg>
      <XStack justifyContent="space-between" marginTop="$2">
        {months.map((month, index) => (
          <Micro key={`${month}-${index}`}>{month}</Micro>
        ))}
      </XStack>
    </View>
  )
}
