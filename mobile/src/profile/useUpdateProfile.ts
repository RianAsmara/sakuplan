import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import type { components } from '../api/client'

type UpdateProfileRequest = components['schemas']['UpdateProfileRequest']
type User = components['schemas']['User']

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateProfileRequest) => {
      try {
        const { data } = await api.put<User>('/v1/me', input)
        return data
      } catch (error) {
        throw new ApiError('failed_to_update_profile', statusFromError(error))
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data)
    },
  })
}
