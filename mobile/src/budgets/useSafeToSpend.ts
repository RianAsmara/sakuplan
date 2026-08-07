import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useSafeToSpend() {
  return useQuery({
    queryKey: ['planning', 'safe-to-spend'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/planning/safe-to-spend')
      if (error || !data) throw new Error('failed_to_load_safe_to_spend')
      return data
    },
  })
}
