import { Button, Spinner, Text, YStack } from 'tamagui'
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
            <Text fontFamily="$body" fontSize="$3" color="$color">
              {user.email}
            </Text>
            <Text fontFamily="$body" fontSize="$2" color="$kulit">
              Ringkasan keuanganmu akan muncul di sini.
            </Text>
          </PocketCard>

          <Button
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
