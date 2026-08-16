import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { operations } from '../api/client'

type BillsResponse = operations['listBills']['responses'][200]['content']['application/json']

export function useBills() {
  return useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      try {
        const { data } = await api.get<BillsResponse>('/v1/bills')
        return data.data
      } catch {
        throw new Error('failed_to_load_bills')
      }
    },
  })
}

