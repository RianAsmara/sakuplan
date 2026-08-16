import { useMutation } from '@tanstack/react-query'
import { Share } from 'react-native'
import { api } from '../api/client'
import { ApiError, statusFromError } from '../api/errors'
import type { components } from '../api/client'

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      let data: components['schemas']['Export']
      try {
        const result = await api.post<components['schemas']['Export']>('/v1/exports')
        data = result.data
      } catch (error) {
        throw new ApiError('failed_to_export_data', statusFromError(error))
      }
      await Share.share({
        title: 'Data SakuPlan',
        message: JSON.stringify(data, null, 2),
      })
      return data
    },
  })
}
