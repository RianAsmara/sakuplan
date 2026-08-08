import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useBills() {
  return useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/bills')
      if (error || !data) throw new Error('failed_to_load_bills')
      return data.data
    },
  })
}
