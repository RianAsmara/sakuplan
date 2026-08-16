import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components, operations } from '../api/client'

type CategoryKind = components['schemas']['CategoryKind']
type CategoriesResponse =
  operations['listCategories']['responses'][200]['content']['application/json']

export function useCategories(kind?: CategoryKind) {
  return useQuery({
    queryKey: ['categories', kind ?? 'all'],
    queryFn: async () => {
      try {
        const { data } = await api.get<CategoriesResponse>('/v1/categories', {
          params: kind ? { kind } : {},
        })
        return data.data
      } catch {
        throw new Error('failed_to_load_categories')
      }
    },
  })
}
