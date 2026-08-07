import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useCashFlowReport({ start, end }: { start: string; end: string }) {
  return useQuery({
    queryKey: ['reports', 'cash-flow', start, end],
    queryFn: async () => {
      const { data, error } = await api.GET('/v1/reports/cash-flow', {
        params: { query: { start, end, group_by: 'day' } },
      })
      if (error || !data) throw new Error('failed_to_load_cash_flow_report')
      return data
    },
  })
}
