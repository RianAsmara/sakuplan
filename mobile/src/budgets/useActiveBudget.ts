import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useActiveBudget() {
  return useQuery({
    queryKey: ['budgets', 'active'],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/v1/budgets/active')
      if (response.status === 404) return null
      if (error || !data) throw new Error('failed_to_load_active_budget')
      return data
    },
  })
}
