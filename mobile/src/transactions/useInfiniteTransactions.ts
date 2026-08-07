import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useInfiniteTransactions() {
  return useInfiniteQuery({
    queryKey: ['transactions'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.GET('/v1/transactions', {
        params: { query: { limit: 50, cursor: pageParam } },
      })
      if (error || !data) throw new Error('failed_to_load_transactions')
      return data
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  })
}
