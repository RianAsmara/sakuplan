import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { operations } from '../api/client'

type GoalsResponse = operations['listGoals']['responses'][200]['content']['application/json']

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      try {
        const { data } = await api.get<GoalsResponse>('/v1/goals')
        return data.data
      } catch {
        throw new Error('failed_to_load_goals')
      }
    },
  })
}
