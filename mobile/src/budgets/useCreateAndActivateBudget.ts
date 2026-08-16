import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import type { components } from '../api/client'

type CreateBudgetRequest = components['schemas']['CreateBudgetRequest']
type Budget = components['schemas']['Budget']

export function useCreateAndActivateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBudgetRequest) => {
      let draft: Budget
      try {
        const { data } = await api.post<Budget>('/v1/budgets', input)
        draft = data
      } catch (error) {
        throw new ApiError('failed_to_create_budget_draft', statusFromError(error))
      }

      try {
        const { data } = await api.post<Budget>(`/v1/budgets/${draft.id}/activate`)
        return data
      } catch (error) {
        throw new ApiError('failed_to_activate_budget', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', 'active'] })
    },
  })
}
