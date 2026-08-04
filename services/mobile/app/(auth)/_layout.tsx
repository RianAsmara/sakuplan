import { Redirect, Slot } from 'expo-router'
import { useAuthStore } from '../../src/auth/store'

export default function AuthGroupLayout() {
  const accessToken = useAuthStore((state) => state.accessToken)
  if (accessToken) {
    return <Redirect href="/(app)/home" />
  }
  return <Slot />
}
