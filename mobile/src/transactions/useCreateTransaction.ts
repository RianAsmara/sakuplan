import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'
import type { components } from '../api/client'

type CreateTransactionRequest = components['schemas']['CreateTransactionRequest']
type Transaction = components['schemas']['Transaction']

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTransactionRequest) => {
      try {
        const { data } = await api.post<Transaction>('/v1/transactions', input, {
          headers: { 'Idempotency-Key': generateIdempotencyKey() },
        })
        return data
      } catch (error) {
        throw new ApiError('failed_to_create_transaction', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
