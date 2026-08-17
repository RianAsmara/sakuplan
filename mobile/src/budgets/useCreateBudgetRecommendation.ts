import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import type { components } from '../api/client'

type RecommendationRequest = components['schemas']['RecommendationRequest']
type Recommendation = components['schemas']['Recommendation']

export function useCreateBudgetRecommendation() {
  return useMutation({
    mutationFn: async (input: RecommendationRequest) => {
      try {
        const { data } = await api.post<Recommendation>('/v1/planning/recommendations', input)
        return data
      } catch (error) {
        throw new ApiError('failed_to_create_recommendation', statusFromError(error))
      }
    },
  })
}
