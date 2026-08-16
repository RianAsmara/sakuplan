import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { operations } from '../api/client'

type TransactionsResponse =
  operations['listTransactions']['responses'][200]['content']['application/json']

export function useInfiniteTransactions() {
  return useInfiniteQuery({
    queryKey: ['transactions'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      try {
        const { data } = await api.get<TransactionsResponse>('/v1/transactions', {
          params: { limit: 50, cursor: pageParam },
        })
        return data
      } catch {
        throw new Error('failed_to_load_transactions')
      }
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  })
}
