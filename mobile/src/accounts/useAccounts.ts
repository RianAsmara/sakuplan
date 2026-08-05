import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/accounts')
      if (error || !data) throw new Error('failed_to_load_accounts')
      return data.data
    },
  })
}
