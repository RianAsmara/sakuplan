import type { components } from '../api/client'

type RiskLevel = components['schemas']['SafeToSpend']['risk_level']

export function riskLevelMeta(risk: RiskLevel): { label: string; color: string } {
  switch (risk) {
    case 'healthy':
      return { label: 'Sehat', color: '$primary' }
    case 'attention':
      return { label: 'Perhatian', color: '$accent' }
    case 'high':
      return { label: 'Waspada', color: '$danger' }
  }
}
