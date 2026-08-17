import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import type { components } from '../api/client'

type CreateAccountRequest = components['schemas']['CreateAccountRequest']
type Account = components['schemas']['Account']

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAccountRequest) => {
      try {
        const { data } = await api.post<Account>('/v1/accounts', input)
        return data
      } catch (error) {
        throw new ApiError('failed_to_create_account', statusFromError(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
