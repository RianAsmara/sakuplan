import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import { generateIdempotencyKey } from '../api/idempotencyKey'
import type { components } from '../api/client'

type GoalContribution = components['schemas']['GoalContribution']

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
      try {
        const { data } = await api.post<GoalContribution>(
          `/v1/goals/${goalId}/contributions`,
          { account_id: accountId, amount },
          { headers: { 'Idempotency-Key': generateIdempotencyKey() } },
        )
        return data
      } catch (error) {
        throw new ApiError('failed_to_contribute_to_goal', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
