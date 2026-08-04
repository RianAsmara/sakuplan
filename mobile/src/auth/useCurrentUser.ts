import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/me')
      if (error || !data) {
        throw new Error('failed_to_load_profile')
      }
      return data
    },
  })
}
