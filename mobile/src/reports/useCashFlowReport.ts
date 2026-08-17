import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { components } from '../api/client'

export function useCashFlowReport({ start, end }: { start: string; end: string }) {
  return useQuery({
    queryKey: ['reports', 'cash-flow', start, end],
    queryFn: async () => {
      try {
        const { data } = await api.get<components['schemas']['CashFlowReport']>(
          '/v1/reports/cash-flow',
          { params: { start, end, group_by: 'day' } },
        )
        return data
      } catch {
        throw new Error('failed_to_load_cash_flow_report')
      }
    },
  })
}
