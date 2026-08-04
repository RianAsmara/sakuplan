import { useState } from 'react'
import { Link } from 'expo-router'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Input, Label, Text, XStack, YStack } from 'tamagui'
import { LogIn, Lock, Mail } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../src/components/PocketCard'
import { useLogin } from '../../src/auth/useLogin'

// Design-only placeholder: no OAuth backend exists yet
// (see docs/design/sakuplan-claude-design-prompt.md, "Priority: redesign
// Login and Register now"). Intentionally a no-op until Google sign-in
// is scoped as a real requirement.
function handleGoogleSignIn() {}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  const canSubmit = email.trim().length > 0 && password.length > 0 && !login.isPending

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack flex={1} backgroundColor="$background" padding="$5" justifyContent="center" gap="$6">
            <Text fontFamily="$heading" fontSize="$5" textAlign="center" color="$color">
              SakuPlan
            </Text>

            <PocketCard elevated>
              <Text fontFamily="$heading" fontSize="$4" color="$color">
                Masuk
              </Text>

              {login.isError ? (
                <YStack
                  backgroundColor="rgba(178,59,51,0.06)"
                  borderLeftWidth={3}
                  borderLeftColor="$danger"
                  borderRadius="$1"
                  padding="$3"
                >
                  <Text fontFamily="$body" color="$tinta" fontSize="$2">
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
                  focusStyle={{ borderColor: '$borderColorFocus' }}
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
                  focusStyle={{ borderColor: '$borderColorFocus' }}
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

              <XStack alignItems="center" gap="$3">
                <YStack flex={1} height={1} backgroundColor="$background" />
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  atau
                </Text>
                <YStack flex={1} height={1} backgroundColor="$background" />
              </XStack>

              <YStack gap="$2">
                <Button
                  backgroundColor="$white"
                  borderWidth={1.5}
                  borderColor="$borderColor"
                  color="$color"
                  onPress={handleGoogleSignIn}
                >
                  Masuk dengan Google
                </Button>
                <Text fontFamily="$body" fontSize="$1" color="$kulit" textAlign="center">
                  Pratinjau desain — integrasi belum tersedia.
                </Text>
              </YStack>

              <XStack justifyContent="center" gap="$2">
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  Belum punya akun?
                </Text>
                <Link href="/(auth)/register">
                  <Text fontFamily="$body" fontSize="$2" color="$primary" textDecorationLine="underline">
                    Daftar
                  </Text>
                </Link>
              </XStack>
            </PocketCard>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
