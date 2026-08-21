import type { components } from '../api/client'

type RiskLevel = components['schemas']['SafeToSpend']['risk_level']

export function riskLevelMeta(risk: RiskLevel): { label: string; color: string } {
  switch (risk) {
    case 'healthy':
      return { label: 'Sehat', color: '$terjaga' }
    case 'attention':
      // leluasa (accent) is reserved for savings goals and AI suggestions only.
      return { label: 'Perhatian', color: '$kulit' }
    case 'high':
      return { label: 'Waspada', color: '$peringatan' }
  }
}
