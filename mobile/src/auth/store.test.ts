import { useAuthStore } from './store'

const testUser = {
  id: 'u1',
  email: 'user@example.com',
  display_name: 'Test User',
  status: 'active' as const,
  role: 'user' as const,
  currency: 'IDR',
  timezone: 'Asia/Jakarta',
  payday: 25,
  minimum_buffer: 0,
  ai_consent: false,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, isHydrating: true })
  })

  it('starts unauthenticated and hydrating', () => {
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.isHydrating).toBe(true)
  })

  it('setSession stores the access token and user', () => {
    useAuthStore.getState().setSession('token-123', testUser)
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('token-123')
    expect(state.user).toEqual(testUser)
  })

  it('clearSession resets to unauthenticated', () => {
    useAuthStore.getState().setSession('token-123', testUser)
    useAuthStore.getState().clearSession()
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.user).toBeNull()
  })

  it('setHydrating toggles the hydration flag', () => {
    useAuthStore.getState().setHydrating(false)
    expect(useAuthStore.getState().isHydrating).toBe(false)
  })
})
