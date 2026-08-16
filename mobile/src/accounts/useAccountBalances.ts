import { useQueries } from '@tanstack/react-query'
import { api } from '../api/client'
import type { operations } from '../api/client'

type AccountBalance =
  operations['getAccountBalance']['responses'][200]['content']['application/json']

export function useAccountBalances(accountIds: string[]) {
  const results = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['accounts', id, 'balance'],
      queryFn: async () => {
        try {
          const { data } = await api.get<AccountBalance>(`/v1/accounts/${id}/balance`)
          return data
        } catch {
          throw new Error('failed_to_load_account_balance')
        }
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
