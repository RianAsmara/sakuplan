import { useQueries } from '@tanstack/react-query'
import { api } from '../api/client'

export function useAccountBalances(accountIds: string[]) {
  const results = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['accounts', id, 'balance'],
      queryFn: async () => {
        const { data, error } = await api.GET('/v1/accounts/{id}/balance', {
          params: { path: { id } },
        })
        if (error || !data) throw new Error('failed_to_load_account_balance')
        return data
      },
    })),
  })

  const balancesById = new Map<string, number>()
  for (const result of results) {
    if (result.data) balancesById.set(result.data.account_id, result.data.balance)
  }

  return {
    balancesById,
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
  }
}
