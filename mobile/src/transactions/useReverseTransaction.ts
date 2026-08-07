import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'

export function useReverseTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error, response } = await api.POST('/v1/transactions/{id}/reverse', {
        params: {
          path: { id },
          header: { 'Idempotency-Key': generateIdempotencyKey() },
        },
        body: { reason },
      })
      if (error || !data) throw new ApiError('failed_to_reverse_transaction', response.status)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
