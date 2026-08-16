import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components } from '../api/client'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const { data } = await api.get<components['schemas']['User']>('/v1/me')
        return data
      } catch {
        throw new Error('failed_to_load_profile')
      }
    },
  })
}
