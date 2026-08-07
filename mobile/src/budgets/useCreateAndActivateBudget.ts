import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { components } from '../api/client'

type CreateBudgetRequest = components['schemas']['CreateBudgetRequest']

export function useCreateAndActivateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBudgetRequest) => {
      const draftResult = await api.POST('/v1/budgets', { body: input })
      if (draftResult.error || !draftResult.data) {
        throw new ApiError('failed_to_create_budget_draft', draftResult.response.status)
      }
      const activateResult = await api.POST('/v1/budgets/{id}/activate', {
        params: { path: { id: draftResult.data.id } },
      })
      if (activateResult.error || !activateResult.data) {
        throw new ApiError('failed_to_activate_budget', activateResult.response.status)
      }
      return activateResult.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'active'] })
    },
  })
}
