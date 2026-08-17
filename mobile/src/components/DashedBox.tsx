import React from 'react'
import Svg, { Rect } from 'react-native-svg'
import { View, type ViewProps } from 'react-native'

/**
 * The dashed hairline card ("PocketCard") is a brand signature — it is what makes the
 * app read as a paper ledger. React Native CANNOT be trusted with `borderStyle:
 * 'dashed'` + `borderRadius`: on Android the corners render as solid, the dash phase
 * differs from iOS, and on some API levels the border disappears entirely. So this
 * draws it with SVG instead and gets identical output on both platforms.
 *
 * Usage:
 *   <DashedBox color="#AEB9B2" radius={8}>…</DashedBox>
 */
export function DashedBox({
  children,
  color = '#AEB9B2',
  radius = 8,
  strokeWidth = 1.5,
  dash = [5, 4],
  fill = 'transparent',
  style,
  ...rest
}: ViewProps & {
  color?: string
  radius?: number
  strokeWidth?: number
  dash?: [number, number]
  fill?: string
}) {
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  const inset = strokeWidth / 2

  return (
    <View
      {...rest}
      style={style}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout
        if (width !== size.w || height !== size.h) setSize({ w: width, h: height })
      }}
    >
      {size.w > 0 && (
        <Svg
          width={size.w}
          height={size.h}
          style={{ position: 'absolute', left: 0, top: 0 }}
          pointerEvents="none"
        >
          <Rect
            x={inset}
            y={inset}
            width={Math.max(size.w - strokeWidth, 0)}
            height={Math.max(size.h - strokeWidth, 0)}
            rx={radius}
            ry={radius}
            fill={fill}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={dash}
          />
        </Svg>
      )}
      {children}
    </View>
  )
}

/**
 * The 1.5px dashed rule along the top of the tab bar. Same reasoning as DashedBox,
 * minus the corners — a straight dashed line is cheap to draw and always correct.
 */
export function DashedRule({
  color = '#AEB9B2',
  strokeWidth = 1.5,
  dash = [5, 4],
}: {
  color?: string
  strokeWidth?: number
  dash?: [number, number]
}) {
  const [w, setW] = React.useState(0)
  return (
    <View
      style={{ height: strokeWidth, width: '100%' }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && (
        <Svg width={w} height={strokeWidth}>
          <Rect
            x={0}
            y={0}
            width={w}
            height={strokeWidth}
            fill={color}
            strokeDasharray={dash}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        </Svg>
      )}
    </View>
  )
}
