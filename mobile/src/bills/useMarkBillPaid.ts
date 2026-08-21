import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'
import type { components } from '../api/client'

type BillOccurrence = components['schemas']['BillOccurrence']

export function useMarkBillPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ billId, dueDate }: { billId: string; dueDate: string }) => {
      try {
        const { data } = await api.post<BillOccurrence>(
          `/v1/bills/${billId}/occurrences`,
          { due_date: dueDate },
          { headers: { 'Idempotency-Key': generateIdempotencyKey() } },
        )
        return data
      } catch (error) {
        throw new ApiError('failed_to_mark_bill_paid', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
