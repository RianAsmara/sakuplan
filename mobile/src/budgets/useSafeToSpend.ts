import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components } from '../api/client'

export function useSafeToSpend() {
  return useQuery({
    queryKey: ['planning', 'safe-to-spend'],
    queryFn: async () => {
      try {
        const { data } = await api.get<components['schemas']['SafeToSpend']>(
          '/v1/planning/safe-to-spend',
        )
        return data
      } catch {
        throw new Error('failed_to_load_safe_to_spend')
      }
    },
  })
}