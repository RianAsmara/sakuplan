import { scaleForTablet } from './responsive'

describe('scaleForTablet', () => {
  it('scales up by the tablet type factor, rounded to the nearest pixel', () => {
    expect(scaleForTablet(20)).toBe(23)
    expect(scaleForTablet(11)).toBe(13)
    expect(scaleForTablet(14)).toBe(16)
  })

  it('rounds .5 up, not to even (matches JS Math.round, not banker\'s rounding)', () => {
    expect(scaleForTablet(30)).toBe(35) // 30 * 1.15 = 34.5 -> 35
  })

  it('returns 0 for 0', () => {
    expect(scaleForTablet(0)).toBe(0)
  })
})
