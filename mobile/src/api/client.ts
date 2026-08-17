import { create } from 'axios'
import { installAuthInterceptors } from './refreshInterceptor'

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'

export const api = create({ baseURL: baseUrl })
installAuthInterceptors(api, baseUrl)

export type { components, operations } from './generated/types'
