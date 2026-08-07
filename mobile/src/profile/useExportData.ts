import { useMutation } from '@tanstack/react-query'
import { Share } from 'react-native'
import { api } from '../api/client'
import { ApiError } from '../api/errors'

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.POST('/v1/exports')
      if (error || !data) {
        const status = (response as unknown as { status: number }).status ?? 500
        throw new ApiError('failed_to_export_data', status)
      }
      await Share.share({
        title: 'Data SakuPlan',
        message: JSON.stringify(data, null, 2),
      })
      return data
    },
  })
}
