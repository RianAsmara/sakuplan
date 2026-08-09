import { useState } from 'react'
import { Button, Text, XStack, YStack } from 'tamagui'
import type { components } from '../api/client'
import { PocketCard } from '../components/PocketCard'
import { TextField } from '../components/TextField'
import { formatDateID } from '../format/date'
import { ApiError } from '../api/errors'
import { formatSignedRupiah, transactionTypeMeta } from './transactionDisplay'
import { useReverseTransaction } from './useReverseTransaction'

type Transaction = components['schemas']['Transaction']
type Category = components['schemas']['Category']

interface TransactionListItemProps {
  transaction: Transaction
  categoriesById: Map<string, Category>
}

export function TransactionListItem({ transaction, categoriesById }: TransactionListItemProps) {
  const [showReversalForm, setShowReversalForm] = useState(false)
  const [reason, setReason] = useState('')
  const reverseTransaction = useReverseTransaction()

  const meta = transactionTypeMeta(transaction.type)
  const categoryName = transaction.category_id ? categoriesById.get(transaction.category_id)?.name : undefined
  const canReverse = transaction.type !== 'reversal' && !transaction.reversed_by_id
  const isConflict = reverseTransaction.error instanceof ApiError && reverseTransaction.error.status === 409

  return (
    <PocketCard>
      <XStack justifyContent="space-between" alignItems="center">
        <YStack flex={1} gap="$1">
          <Text fontFamily="$body" fontSize="$1" color={meta.color}>
            {meta.label.toUpperCase()}
          </Text>
          <Text fontFamily="$body" fontSize="$3" color="$color">
            {categoryName ?? transaction.note ?? meta.label}
          </Text>
          <Text fontFamily="$body" fontSize="$1" color="$kulit">
            {formatDateID(transaction.occurred_at)}
          </Text>
        </YStack>
        <Text fontFamily="$mono" fontSize="$3" color={meta.color}>
          {formatSignedRupiah(transaction.type, transaction.amount)}
        </Text>
      </XStack>

      {canReverse && showReversalForm ? (
        <YStack gap="$2">
          <TextField
            placeholder="Alasan pembatalan"
            value={reason}
            onChangeText={setReason}
          />
          {isConflict ? (
            <Text fontFamily="$body" fontSize="$1" color="$danger">
              Transaksi ini sudah pernah dibatalkan.
            </Text>
          ) : reverseTransaction.isError ? (
            <Text fontFamily="$body" fontSize="$1" color="$danger">
              Gagal membatalkan transaksi. Coba lagi.
            </Text>
          ) : null}
          <XStack gap="$2">
            <Button
              flex={1}
              size="$3"
              backgroundColor="$danger"
              color="$white"
              disabled={reason.trim().length === 0 || reverseTransaction.isPending}
              onPress={() => reverseTransaction.mutate({ id: transaction.id, reason: reason.trim() })}
            >
              {reverseTransaction.isPending ? 'Membatalkan...' : 'Konfirmasi Pembatalan'}
            </Button>
            <Button
              flex={1}
              size="$3"
              backgroundColor="$white"
              borderWidth={1.5}
              borderColor="$borderColor"
              color="$color"
              onPress={() => setShowReversalForm(false)}
            >
              Batal
            </Button>
          </XStack>
        </YStack>
      ) : canReverse ? (
        <Button
          size="$3"
          backgroundColor="$white"
          borderWidth={1.5}
          borderColor="$borderColor"
          color="$danger"
          onPress={() => setShowReversalForm(true)}
        >
          Batalkan Transaksi
        </Button>
      ) : null}
    </PocketCard>
  )
}
