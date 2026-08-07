import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { components } from '../api/client'

type UpdateProfileRequest = components['schemas']['UpdateProfileRequest']

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateProfileRequest) => {
      const { data, error, response } = await api.PUT('/v1/me', { body: input })
      if (error || !data) throw new ApiError('failed_to_update_profile', response.status)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data)
    },
  })
}
