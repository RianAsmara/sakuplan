import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'
import type { components } from '../api/client'

type Transaction = components['schemas']['Transaction']

export function useReverseTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      try {
        const { data } = await api.post<Transaction>(
          `/v1/transactions/${id}/reverse`,
          { reason },
          { headers: { 'Idempotency-Key': generateIdempotencyKey() } },
        )
        return data
      } catch (error) {
        throw new ApiError('failed_to_reverse_transaction', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
