import { create } from 'zustand'
import type { components } from '../api/client'

type User = components['schemas']['User']

interface AuthState {
  accessToken: string | null
  user: User | null
  isHydrating: boolean
  setSession: (accessToken: string, user: User) => void
  clearSession: () => void
  setHydrating: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isHydrating: true,
  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
  setHydrating: (value) => set({ isHydrating: value }),
}))
