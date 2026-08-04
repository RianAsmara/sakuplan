import createClient from 'openapi-fetch'
import type { paths } from './generated/types'
import { installAuthMiddleware } from './refreshInterceptor'

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'

export const api = createClient<paths>({ baseUrl })
installAuthMiddleware(api, baseUrl)

export type { paths, components } from './generated/types'
