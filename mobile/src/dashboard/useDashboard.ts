import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/dashboard')
      if (error || !data) {
        throw new Error('failed_to_load_dashboard')
      }
      return data
    },
  })
}
