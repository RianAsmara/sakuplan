import { useState } from 'react'
import { Link } from 'expo-router'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Checkbox, Label, ScrollView, Text, XStack, YStack } from 'tamagui'
import { Check, Lock, Mail, User, UserPlus } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../src/components/PocketCard'
import { TextField } from '../../src/components/TextField'
import { useRegister } from '../../src/auth/useRegister'

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
                Buat Akun
              </Text>

              {register.isError ? (
                <YStack
                  backgroundColor="rgba(178,59,51,0.06)"
                  borderLeftWidth={3}
                  borderLeftColor="$danger"
                  borderRadius="$1"
                  padding="$3"
                >
                  <Text fontFamily="$body" color="$tinta" fontSize="$2">
                    Terjadi kesalahan. Coba lagi.
                  </Text>
                </YStack>
              ) : null}

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <User size={14} color="$kulit" />
                  <Label htmlFor="register-name" fontFamily="$body" fontSize="$2" color="$kulit">
                    Nama
                  </Label>
                </XStack>
                <TextField
                  id="register-name"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </YStack>

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Mail size={14} color="$kulit" />
                  <Label htmlFor="register-email" fontFamily="$body" fontSize="$2" color="$kulit">
                    Email
                  </Label>
                </XStack>
                <TextField
                  id="register-email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </YStack>

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Lock size={14} color="$kulit" />
                  <Label htmlFor="register-password" fontFamily="$body" fontSize="$2" color="$kulit">
                    Kata sandi
                  </Label>
                </XStack>
                <TextField
                  id="register-password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="newPassword"
                />
              </YStack>

              <YStack gap="$2">
                <XStack alignItems="center" gap="$2">
                  <Lock size={14} color="$kulit" />
                  <Label htmlFor="register-confirm" fontFamily="$body" fontSize="$2" color="$kulit">
                    Konfirmasi kata sandi
                  </Label>
                </XStack>
                <TextField
                  id="register-confirm"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  textContentType="newPassword"
                />
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  Minimal 12 karakter
                </Text>
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
                <Text fontFamily="$body" fontSize="$1" color="$kulit" flexShrink={1}>
                  Saya menyetujui{' '}
                  <Text color="$primary" textDecorationLine="underline">
                    Ketentuan Layanan
                  </Text>{' '}
                  dan{' '}
                  <Text color="$primary" textDecorationLine="underline">
                    Kebijakan Privasi
                  </Text>
                </Text>
              </XStack>

              <Button
                icon={UserPlus}
                backgroundColor="$primary"
                color="$primaryText"
                disabled={!canSubmit}
                opacity={canSubmit ? 1 : 0.5}
                onPress={() => register.mutate({ email, password, displayName })}
              >
                {register.isPending ? 'Memuat...' : 'Daftar'}
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
                  Daftar dengan Google
                </Button>
                <Text fontFamily="$body" fontSize="$1" color="$kulit" textAlign="center">
                  Pratinjau desain — integrasi belum tersedia.
                </Text>
              </YStack>

              <XStack justifyContent="center" gap="$2">
                <Text fontFamily="$body" fontSize="$2" color="$kulit">
                  Sudah punya akun?
                </Text>
                <Link href="/(auth)/login">
                  <Text fontFamily="$body" fontSize="$2" color="$primary" textDecorationLine="underline">
                    Masuk
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
