import { Redirect, Slot } from 'expo-router'
import { useAuthStore } from '../../src/auth/store'

export default function AppGroupLayout() {
  const accessToken = useAuthStore((state) => state.accessToken)
  if (!accessToken) {
    return <Redirect href="/(auth)/login" />
  }
  return <Slot />
}
