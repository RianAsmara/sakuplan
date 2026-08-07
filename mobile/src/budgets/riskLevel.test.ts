import { riskLevelMeta } from './riskLevel'

describe('riskLevelMeta', () => {
  it('labels healthy in the primary color', () => {
    expect(riskLevelMeta('healthy')).toEqual({ label: 'Sehat', color: '$primary' })
  })

  it('labels attention in the accent color', () => {
    expect(riskLevelMeta('attention')).toEqual({ label: 'Perhatian', color: '$accent' })
  })

  it('labels high risk in the danger color', () => {
    expect(riskLevelMeta('high')).toEqual({ label: 'Waspada', color: '$danger' })
  })
})
