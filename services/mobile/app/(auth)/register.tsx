import { useState } from 'react'
import { Link } from 'expo-router'
import { Button, Checkbox, Input, Label, Text, XStack, YStack } from 'tamagui'
import { Check } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../src/components/PocketCard'
import { useRegister } from '../../src/auth/useRegister'

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const register = useRegister()

  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 12 &&
    consentAccepted &&
    !register.isPending

  return (
    <YStack flex={1} backgroundColor="$background" padding="$5" justifyContent="center" gap="$6">
      <Text fontFamily="$heading" fontSize="$5" textAlign="center" color="$color">
        SakuPlan
      </Text>

      <PocketCard>
        <Text fontFamily="$heading" fontSize="$4" color="$color">
          Buat akun SakuPlan
        </Text>

        {register.isError ? (
          <YStack backgroundColor="$peringatan" borderRadius="$2" padding="$3">
            <Text fontFamily="$body" color="$white" fontSize="$2">
              Terjadi kesalahan. Coba lagi.
            </Text>
          </YStack>
        ) : null}

        <YStack gap="$2">
          <Label htmlFor="register-name" fontFamily="$body" fontSize="$2" color="$kulit">
            Nama tampilan
          </Label>
          <Input id="register-name" value={displayName} onChangeText={setDisplayName} />
        </YStack>

        <YStack gap="$2">
          <Label htmlFor="register-email" fontFamily="$body" fontSize="$2" color="$kulit">
            Email
          </Label>
          <Input
            id="register-email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </YStack>

        <YStack gap="$2">
          <Label htmlFor="register-password" fontFamily="$body" fontSize="$2" color="$kulit">
            Kata sandi
          </Label>
          <Input
            id="register-password"
            value={password}
            onChangeText={setPassword}
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
          backgroundColor="$primary"
          color="$primaryText"
          disabled={!canSubmit}
          opacity={canSubmit ? 1 : 0.5}
          onPress={() =>
            register.mutate({ email, password, displayName })
          }
        >
          {register.isPending ? 'Memuat...' : 'Buat Akun'}
        </Button>

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
  )
}
