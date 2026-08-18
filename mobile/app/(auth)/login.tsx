import { LogIn, Lock, Mail } from '@tamagui/lucide-icons-2'
import { Link } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Label, XStack, YStack } from 'tamagui'
import { useLogin } from '../../src/auth/useLogin'
import { GoogleIcon } from '../../src/components/GoogleIcon'
import { PocketCard } from '../../src/components/PocketCard'
import {
  AuthHeading,
  BodyS,
  ButtonLabel,
  FlowScreen,
  InlineAction,
  Meta,
  PrimaryButton,
  SecondaryButton,
  Wordmark,
} from '../../src/components/primitives'
import { TextField } from '../../src/components/TextField'

// Design-only placeholder: no OAuth backend exists yet
// (see docs/design/sakuplan-claude-design-prompt.md, "Priority: redesign
// Login and Register now"). Intentionally a no-op until Google sign-in
// is scoped as a real requirement.
function handleGoogleSignIn() {}

const fieldInputProps = {
  borderWidth: 1.5,
  borderRadius: '$3',
  paddingHorizontal: '$3.5',
  paddingVertical: 13,
  fontSize: '$5',
} as const

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  const canSubmit = email.trim().length > 0 && password.length > 0 && !login.isPending

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8F4' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <FlowScreen justifyContent="center" gap="$6">
            <YStack alignItems="center" gap="$2">
              <Wordmark size="l">SakuPlan</Wordmark>
              <Meta textAlign="center">
                Kelola pengeluaran dan lihat berapa yang aman kamu belanjakan hari ini.
              </Meta>
            </YStack>

            <PocketCard elevated padding="$6" gap="$4">
              <AuthHeading>Masuk</AuthHeading>

              {login.isError ? (
                <YStack
                  backgroundColor="$peringatanFill"
                  borderLeftWidth={3}
                  borderLeftColor="$danger"
                  borderRadius="$1.5"
                  paddingHorizontal="$3"
                  paddingVertical="$2.5"
                >
                  <BodyS color="$tinta">Email atau kata sandi salah.</BodyS>
                </YStack>
              ) : null}

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Mail size={14} color="$kulit" />
                  <Label
                    htmlFor="login-email"
                    fontFamily="$mono"
                    fontWeight="500"
                    fontSize={11}
                    lineHeight={15}
                    letterSpacing={0.44}
                    color="$kulit"
                  >
                    EMAIL
                  </Label>
                </XStack>
                <TextField
                  id="login-email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  {...fieldInputProps}
                />
              </YStack>

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Lock size={14} color="$kulit" />
                  <Label
                    htmlFor="login-password"
                    fontFamily="$mono"
                    fontWeight="500"
                    fontSize={11}
                    lineHeight={15}
                    letterSpacing={0.44}
                    color="$kulit"
                  >
                    KATA SANDI
                  </Label>
                </XStack>
                <TextField
                  id="login-password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="password"
                  {...fieldInputProps}
                />
              </YStack>

              <PrimaryButton
                gap="$2"
                opacity={canSubmit ? 1 : 0.5}
                disabled={!canSubmit}
                onPress={() => login.mutate({ email, password })}
              >
                <LogIn size={16} color="$primaryText" />
                <ButtonLabel color="$primaryText">
                  {login.isPending ? 'Memuat...' : 'Masuk'}
                </ButtonLabel>
              </PrimaryButton>

              <XStack alignItems="center" gap="$3">
                <YStack flex={1} height={1} backgroundColor="$kertas" />
                <Meta>atau</Meta>
                <YStack flex={1} height={1} backgroundColor="$kertas" />
              </XStack>

              <YStack gap="$2">
                <SecondaryButton onPress={handleGoogleSignIn}>
                  <GoogleIcon size={18} />
                  <ButtonLabel color="$tinta">Masuk dengan Google</ButtonLabel>
                </SecondaryButton>
                <Meta textAlign="center">Pratinjau desain — integrasi belum tersedia.</Meta>
              </YStack>

              <XStack justifyContent="center" gap="$2">
                <Meta>Belum punya akun?</Meta>
                <Link href="/(auth)/register">
                  <InlineAction>Daftar</InlineAction>
                </Link>
              </XStack>
            </PocketCard>
          </FlowScreen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
