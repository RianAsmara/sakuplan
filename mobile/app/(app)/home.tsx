import { Button, Spinner, Text, XStack, YStack } from 'tamagui'
import { LogOut, Mail } from '@tamagui/lucide-icons-2'
import { PocketCard } from '../../src/components/PocketCard'
import { useCurrentUser } from '../../src/auth/useCurrentUser'
import { useLogout } from '../../src/auth/useLogout'

export default function HomeScreen() {
  const { data: user, isLoading } = useCurrentUser()
  const logout = useLogout()

  return (
    <YStack flex={1} backgroundColor="$background" padding="$5" justifyContent="center" gap="$6">
      {isLoading || !user ? (
        <YStack alignItems="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      ) : (
        <>
          <Text fontFamily="$heading" fontSize="$5" color="$color">
            {`Halo, ${user.display_name}`}
          </Text>

          <PocketCard>
            <Text fontFamily="$body" fontSize="$2" color="$kulit">
              Akun kamu sudah aktif.
            </Text>
            <XStack alignItems="center" gap="$2">
              <Mail size={14} color="$color" />
              <Text fontFamily="$body" fontSize="$3" color="$color">
                {user.email}
              </Text>
            </XStack>
            <Text fontFamily="$body" fontSize="$2" color="$kulit">
              Ringkasan keuanganmu akan muncul di sini.
            </Text>
          </PocketCard>

          <Button
            icon={LogOut}
            alignSelf="center"
            backgroundColor="transparent"
            color="$kulit"
            onPress={() => logout.mutate()}
          >
            Keluar
          </Button>
        </>
      )}
    </YStack>
  )
}
