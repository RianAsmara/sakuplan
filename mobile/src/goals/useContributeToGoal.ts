import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'

export function useContributeToGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      goalId,
      accountId,
      amount,
    }: {
      goalId: string
      accountId: string
      amount: number
    }) => {
      const { data, error, response } = await api.POST('/v1/goals/{id}/contributions', {
        params: {
          path: { id: goalId },
          header: { 'Idempotency-Key': generateIdempotencyKey() },
        },
        body: { account_id: accountId, amount },
      })
      if (error || !data) throw new ApiError('failed_to_contribute_to_goal', (response as any).status)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
