import { useState } from 'react'
import { Button, Text, XStack, YStack } from 'tamagui'
import { PocketCard } from '../components/PocketCard'
import { RupiahInput } from '../components/RupiahInput'
import { TextField } from '../components/TextField'
import { useCreateAccount } from './useCreateAccount'
import { ACCOUNT_TYPES, accountTypeLabel } from './accountTypeLabels'
import type { components } from '../api/client'

type AccountType = components['schemas']['AccountType']

export function AddAccountCard() {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [initialBalance, setInitialBalance] = useState(0)
  const createAccount = useCreateAccount()

  const canSubmit = name.trim().length > 0 && !createAccount.isPending

  return (
    <PocketCard elevated>
      <Text fontFamily="$heading" fontSize="$4" color="$color">
        Tambahkan Akun Pertamamu
      </Text>
      <Text fontFamily="$body" fontSize="$2" color="$kulit">
        Kamu butuh minimal satu akun sebelum bisa mencatat transaksi.
      </Text>

      {createAccount.isError ? (
        <Text fontFamily="$body" fontSize="$2" color="$danger">
          Gagal menambahkan akun. Coba lagi.
        </Text>
      ) : null}

      <YStack gap="$2">
        <Text fontFamily="$body" fontSize="$1" color="$kulit">
          NAMA AKUN
        </Text>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Contoh: Dompet, BCA"
        />
      </YStack>

      <YStack gap="$2">
        <Text fontFamily="$body" fontSize="$1" color="$kulit">
          JENIS AKUN
        </Text>
        <XStack gap="$2" flexWrap="wrap">
          {ACCOUNT_TYPES.map((option) => (
            <Button
              key={option}
              size="$3"
              backgroundColor={type === option ? '$primary' : '$white'}
              color={type === option ? '$primaryText' : '$color'}
              borderWidth={1.5}
              borderColor={type === option ? '$primary' : '$borderColor'}
              onPress={() => setType(option)}
            >
              {accountTypeLabel(option)}
            </Button>
          ))}
        </XStack>
      </YStack>

      <YStack gap="$2">
        <Text fontFamily="$body" fontSize="$1" color="$kulit">
          SALDO AWAL
        </Text>
        <RupiahInput value={initialBalance} onChangeValue={setInitialBalance} />
      </YStack>

      <Button
        backgroundColor="$primary"
        color="$primaryText"
        disabled={!canSubmit}
        opacity={canSubmit ? 1 : 0.5}
        onPress={() =>
          createAccount.mutate({
            name: name.trim(),
            type,
            // Generated CreateAccountRequest type requires currency even though
            // the OpenAPI schema defaults it to IDR. The app is IDR-only and this
            // field is not exposed in the UI, so we hardcode it.
            currency: 'IDR',
            initial_balance: initialBalance,
            // Savings accounts are conventionally excluded from
            // "safe to spend" math; every other type counts as spendable.
            spendable: type !== 'savings',
          })
        }
      >
        {createAccount.isPending ? 'Menyimpan...' : 'Simpan Akun'}
      </Button>
    </PocketCard>
  )
}
