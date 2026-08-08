import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/goals')
      if (error || !data) throw new Error('failed_to_load_goals')
      return data.data
    },
  })
}
