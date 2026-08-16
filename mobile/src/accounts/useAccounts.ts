import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { operations } from '../api/client'

type AccountsResponse = operations['listAccounts']['responses'][200]['content']['application/json']

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      try {
        const { data } = await api.get<AccountsResponse>('/v1/accounts')
        return data.data
      } catch {
        throw new Error('failed_to_load_accounts')
      }
    },
  })
}
