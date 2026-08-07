import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'
import type { components } from '../api/client'

type CreateTransactionRequest = components['schemas']['CreateTransactionRequest']

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTransactionRequest) => {
      const { data, error, response } = await api.POST('/v1/transactions', {
        params: { header: { 'Idempotency-Key': generateIdempotencyKey() } },
        body: input,
      })
      if (error || !data) throw new ApiError('failed_to_create_transaction', response.status)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
