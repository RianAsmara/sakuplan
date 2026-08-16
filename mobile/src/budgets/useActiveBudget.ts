import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { statusFromError } from '../api/errors'
import type { components } from '../api/client'

export function useActiveBudget() {
  return useQuery({
    queryKey: ['budgets', 'active'],
    queryFn: async () => {
      try {
        const { data } = await api.get<components['schemas']['Budget']>('/v1/budgets/active')
        return data
      } catch (error) {
        if (statusFromError(error, 0) === 404) return null
        throw new Error('failed_to_load_active_budget')
      }
    },
  })
}
