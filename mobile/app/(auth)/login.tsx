import { useState } from 'react'
import { Link } from 'expo-router'
import { Button, Input, Label, Text, XStack, YStack } from 'tamagui'
import { LogIn, Lock, Mail } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../src/components/PocketCard'
import { useLogin } from '../../src/auth/useLogin'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  const canSubmit = email.trim().length > 0 && password.length > 0 && !login.isPending

  return (
    <YStack flex={1} backgroundColor="$background" padding="$5" justifyContent="center" gap="$6">
      <Text fontFamily="$heading" fontSize="$5" textAlign="center" color="$color">
        SakuPlan
      </Text>

      <PocketCard>
        <Text fontFamily="$heading" fontSize="$4" color="$color">
          Masuk ke SakuPlan
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$kulit">
          Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari ini.
        </Text>

        {login.isError ? (
          <YStack backgroundColor="$peringatan" borderRadius="$2" padding="$3">
            <Text fontFamily="$body" color="$white" fontSize="$2">
              Email atau kata sandi salah.
            </Text>
          </YStack>
        ) : null}

        <YStack gap="$2">
          <XStack alignItems="center" gap="$2">
            <Mail size={14} color="$kulit" />
            <Label htmlFor="login-email" fontFamily="$body" fontSize="$2" color="$kulit">
              Email
            </Label>
          </XStack>
          <Input
            id="login-email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            color="$color"
          />
        </YStack>

        <YStack gap="$2">
          <XStack alignItems="center" gap="$2">
            <Lock size={14} color="$kulit" />
            <Label htmlFor="login-password" fontFamily="$body" fontSize="$2" color="$kulit">
              Kata sandi
            </Label>
          </XStack>
          <Input
            id="login-password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            color="$color"
          />
        </YStack>

        <Button
          icon={LogIn}
          backgroundColor="$primary"
          color="$primaryText"
          disabled={!canSubmit}
          opacity={canSubmit ? 1 : 0.5}
          onPress={() => login.mutate({ email, password })}
        >
          {login.isPending ? 'Memuat...' : 'Masuk'}
        </Button>

        <XStack justifyContent="center" gap="$2">
          <Text fontFamily="$body" fontSize="$2" color="$kulit">
            Belum punya akun?
          </Text>
          <Link href="/(auth)/register">
            <Text fontFamily="$body" fontSize="$2" color="$primary" textDecorationLine="underline">
              Buat akun
            </Text>
          </Link>
        </XStack>
      </PocketCard>
    </YStack>
  )
}
