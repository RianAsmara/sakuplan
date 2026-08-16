import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components } from '../api/client'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        const { data } = await api.get<components['schemas']['Dashboard']>('/v1/dashboard')
        return data
      } catch {
        throw new Error('failed_to_load_dashboard')
      }
    },
  })
}
