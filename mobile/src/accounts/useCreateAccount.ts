import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError } from '../api/errors'
import type { components } from '../api/client'

type CreateAccountRequest = components['schemas']['CreateAccountRequest']

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAccountRequest) => {
      const { data, error, response } = await api.POST('/v1/accounts', { body: input })
      if (error || !data) {
        const status = (response as unknown as { status: number }).status ?? 500
        throw new ApiError('failed_to_create_account', status)
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
