import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components } from '../api/client'

type CategoryKind = components['schemas']['CategoryKind']

export function useCategories(kind?: CategoryKind) {
  return useQuery({
    queryKey: ['categories', kind ?? 'all'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/categories', {
        params: { query: kind ? { kind } : {} },
      })
      if (error || !data) throw new Error('failed_to_load_categories')
      return data.data
    },
  })
}
