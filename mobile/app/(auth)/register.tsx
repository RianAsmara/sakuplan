import { Check, Lock, Mail, User, UserPlus } from '@tamagui/lucide-icons-2'
import { Link } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Checkbox, ScrollView, XStack, YStack } from 'tamagui'
import { useRegister } from '../../src/auth/useRegister'
import { GoogleIcon } from '../../src/components/GoogleIcon'
import { PocketCard } from '../../src/components/PocketCard'
import {
  AuthHeading,
  BodyS,
  ButtonLabel,
  FieldLabel,
  FlowScreen,
  InlineAction,
  Meta,
  MetaS,
  PrimaryButton,
  SecondaryButton,
  Wordmark,
  inputStyle,
} from '../../src/components/primitives'
import { TextField } from '../../src/components/TextField'

// Design-only placeholder: no OAuth backend exists yet
// (see docs/design/sakuplan-claude-design-prompt.md, "Priority: redesign
// Login and Register now"). Intentionally a no-op until Google sign-in
// is scoped as a real requirement.
function handleGoogleSignIn() {}

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const register = useRegister()

  const passwordsMatch = password.length > 0 && password === confirmPassword
  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 12 &&
    passwordsMatch &&
    consentAccepted &&
    !register.isPending

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
              <AuthHeading>Buat Akun</AuthHeading>

              {register.isError ? (
                <YStack
                  backgroundColor="$peringatanFill"
                  borderLeftWidth={3}
                  borderLeftColor="$danger"
                  borderRadius="$1.5"
                  paddingHorizontal="$3"
                  paddingVertical="$2.5"
                >
                  <BodyS color="$tinta">Terjadi kesalahan. Coba lagi.</BodyS>
                </YStack>
              ) : null}

              <YStack gap="$2">
                <FieldLabel htmlFor="register-name" icon={<User size={14} color="$kulit" />}>
                  NAMA
                </FieldLabel>
                <TextField id="register-name" value={displayName} onChangeText={setDisplayName} {...inputStyle} />
              </YStack>

              <YStack gap="$2">
                <FieldLabel htmlFor="register-email" icon={<Mail size={14} color="$kulit" />}>
                  EMAIL
                </FieldLabel>
                <TextField
                  id="register-email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  {...inputStyle}
                />
              </YStack>

              <YStack gap="$2">
                <FieldLabel htmlFor="register-password" icon={<Lock size={14} color="$kulit" />}>
                  KATA SANDI
                </FieldLabel>
                <TextField
                  id="register-password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  {...inputStyle}
                />
              </YStack>

              <YStack gap="$2">
                <FieldLabel htmlFor="register-confirm" icon={<Lock size={14} color="$kulit" />}>
                  KONFIRMASI KATA SANDI
                </FieldLabel>
                <TextField
                  id="register-confirm"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  {...inputStyle}
                />
                <MetaS>Minimal 12 karakter</MetaS>
              </YStack>

              <XStack alignItems="center" gap="$3">
                <Checkbox
                  id="register-consent"
                  checked={consentAccepted}
                  onCheckedChange={(value) => setConsentAccepted(value === true)}
                  backgroundColor={consentAccepted ? '$primary' : undefined}
                  borderColor="$kulit"
                >
                  <Checkbox.Indicator>
                    <Check color="$primaryText" />
                  </Checkbox.Indicator>
                </Checkbox>
                <MetaS flexShrink={1}>
                  Saya menyetujui{' '}
                  <MetaS color="$primary" textDecorationLine="underline">
                    Ketentuan Layanan
                  </MetaS>{' '}
                  dan{' '}
                  <MetaS color="$primary" textDecorationLine="underline">
                    Kebijakan Privasi
                  </MetaS>
                </MetaS>
              </XStack>

              <PrimaryButton
                gap="$2"
                opacity={canSubmit ? 1 : 0.5}
                disabled={!canSubmit}
                accessibilityState={{ disabled: !canSubmit }}
                onPress={() => register.mutate({ email, password, displayName })}
              >
                <UserPlus size={16} color="$primaryText" />
                <ButtonLabel color="$primaryText">
                  {register.isPending ? 'Memuat...' : 'Daftar'}
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
                  <ButtonLabel color="$tinta">Daftar dengan Google</ButtonLabel>
                </SecondaryButton>
                <Meta textAlign="center">Pratinjau desain — integrasi belum tersedia.</Meta>
              </YStack>

              <XStack justifyContent="center" gap="$2">
                <Meta>Sudah punya akun?</Meta>
                <Link href="/(auth)/login">
                  <InlineAction>Masuk</InlineAction>
                </Link>
              </XStack>
            </PocketCard>
          </FlowScreen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
