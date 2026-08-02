import createClient from 'openapi-fetch'
import type { paths } from './generated/types'

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'

export const api = createClient<paths>({ baseUrl })

export type { paths, components } from './generated/types'
