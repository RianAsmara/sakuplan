import { riskLevelMeta } from './riskLevel'

describe('riskLevelMeta', () => {
  it('labels healthy in terjaga', () => {
    expect(riskLevelMeta('healthy')).toEqual({ label: 'Sehat', color: '$terjaga' })
  })

  it('labels attention in neutral kulit', () => {
    expect(riskLevelMeta('attention')).toEqual({ label: 'Perhatian', color: '$kulit' })
  })

  it('labels high risk in peringatan', () => {
    expect(riskLevelMeta('high')).toEqual({ label: 'Waspada', color: '$peringatan' })
  })
})
