import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { components } from '../api/client'

type RecommendationRequest = components['schemas']['RecommendationRequest']

export function useCreateBudgetRecommendation() {
  return useMutation({
    mutationFn: async (input: RecommendationRequest) => {
      const { data, error, response } = await api.POST('/v1/planning/recommendations', { body: input })
      if (error || !data) {
        const status = (response as unknown as { status: number }).status ?? 500
        throw new ApiError('failed_to_create_recommendation', status)
      }
      return data
    },
  })
}
