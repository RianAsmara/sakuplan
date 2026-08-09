import { useMemo, useState } from 'react'
import { FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { PocketCard } from '../../../src/components/PocketCard'
import { RupiahInput } from '../../../src/components/RupiahInput'
import { TextField } from '../../../src/components/TextField'
import { ApiError } from '../../../src/api/errors'
import { daysAgo, toRFC3339 } from '../../../src/format/date'
import { useAccounts } from '../../../src/accounts/useAccounts'
import { AddAccountCard } from '../../../src/accounts/AddAccountCard'
import { useCategories } from '../../../src/categories/useCategories'
import { useCreateTransaction } from '../../../src/transactions/useCreateTransaction'
import { useInfiniteTransactions } from '../../../src/transactions/useInfiniteTransactions'
import { TransactionListItem } from '../../../src/transactions/TransactionListItem'
import type { components } from '../../../src/api/client'

type CreateTransactionType = components['schemas']['CreateTransactionType']

const TYPE_LABELS: Record<CreateTransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Transfer',
  adjustment: 'Penyesuaian',
}

export default function TransactionsScreen() {
  const accounts = useAccounts()
  const [type, setType] = useState<CreateTransactionType>('expense')
  const [accountId, setAccountId] = useState<string | undefined>(undefined)
  const [destinationAccountId, setDestinationAccountId] = useState<string | undefined>(undefined)
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [dateChoice, setDateChoice] = useState<'today' | 'yesterday'>('today')

  const categories = useCategories(type === 'income' || type === 'expense' ? type : undefined)
  const createTransaction = useCreateTransaction()
  const allCategories = useCategories()
  const transactions = useInfiniteTransactions()
  const categoriesById = useMemo(
    () => new Map((allCategories.data ?? []).map((category) => [category.id, category])),
    [allCategories.data]
  )
  const transactionItems = transactions.data?.pages.flatMap((page) => page.data) ?? []

  const hasAccounts = (accounts.data?.length ?? 0) > 0
  const canOfferTransfer = (accounts.data?.length ?? 0) >= 2
  const availableTypes: CreateTransactionType[] = canOfferTransfer
    ? ['income', 'expense', 'transfer', 'adjustment']
    : ['income', 'expense', 'adjustment']

  const isConflict = createTransaction.error instanceof ApiError && createTransaction.error.status === 409

  const canSubmit = (() => {
    if (!accountId || amount <= 0 || createTransaction.isPending) return false
    if (type === 'income' || type === 'expense') return !!categoryId
    if (type === 'transfer') return !!destinationAccountId && destinationAccountId !== accountId
    if (type === 'adjustment') return reason.trim().length > 0
    return false
  })()

  function handleSubmit() {
    if (!accountId) return
    const occurredAt = toRFC3339(dateChoice === 'today' ? new Date() : daysAgo(new Date(), 1))
    createTransaction.mutate(
      {
        type,
        account_id: accountId,
        destination_account_id: type === 'transfer' ? destinationAccountId : undefined,
        category_id: type === 'income' || type === 'expense' ? categoryId : undefined,
        amount,
        occurred_at: occurredAt,
        note: note.trim() || undefined,
        reason: type === 'adjustment' ? reason.trim() : undefined,
      },
      {
        onSuccess: () => {
          setAmount(0)
          setNote('')
          setReason('')
        },
      }
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6F3' }} edges={['top']}>
      <ScrollView flex={1} backgroundColor="$background">
        <YStack padding="$5" gap="$4">
          <Text fontFamily="$heading" fontSize="$4" color="$color">
            Transaksi
          </Text>

          {accounts.isLoading ? (
            <YStack alignItems="center" paddingTop="$6">
              <Spinner size="large" color="$primary" />
            </YStack>
          ) : !hasAccounts ? (
            <AddAccountCard />
          ) : (
            <PocketCard elevated>
              <Text fontFamily="$heading" fontSize="$4" color="$color">
                Catat Transaksi Baru
              </Text>

              {isConflict ? (
                <Text fontFamily="$body" fontSize="$2" color="$danger">
                  Transaksi ini sepertinya sudah tersimpan. Periksa riwayat di bawah.
                </Text>
              ) : createTransaction.isError ? (
                <Text fontFamily="$body" fontSize="$2" color="$danger">
                  Gagal menyimpan transaksi. Coba lagi.
                </Text>
              ) : null}

              <XStack gap="$2" flexWrap="wrap">
                {availableTypes.map((option) => (
                  <Button
                    key={option}
                    size="$3"
                    backgroundColor={type === option ? '$primary' : '$white'}
                    color={type === option ? '$primaryText' : '$color'}
                    borderWidth={1.5}
                    borderColor={type === option ? '$primary' : '$borderColor'}
                    onPress={() => setType(option)}
                  >
                    {TYPE_LABELS[option]}
                  </Button>
                ))}
              </XStack>
              {!canOfferTransfer ? (
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  Tambahkan satu akun lagi untuk bisa mencatat transfer.
                </Text>
              ) : null}

              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  AKUN
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {accounts.data?.map((account) => (
                    <Button
                      key={account.id}
                      size="$3"
                      backgroundColor={accountId === account.id ? '$primary' : '$white'}
                      color={accountId === account.id ? '$primaryText' : '$color'}
                      borderWidth={1.5}
                      borderColor={accountId === account.id ? '$primary' : '$borderColor'}
                      onPress={() => setAccountId(account.id)}
                    >
                      {account.name}
                    </Button>
                  ))}
                </XStack>
              </YStack>

              {type === 'transfer' ? (
                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    AKUN TUJUAN
                  </Text>
                  <XStack gap="$2" flexWrap="wrap">
                    {accounts.data
                      ?.filter((account) => account.id !== accountId)
                      .map((account) => (
                        <Button
                          key={account.id}
                          size="$3"
                          backgroundColor={destinationAccountId === account.id ? '$primary' : '$white'}
                          color={destinationAccountId === account.id ? '$primaryText' : '$color'}
                          borderWidth={1.5}
                          borderColor={destinationAccountId === account.id ? '$primary' : '$borderColor'}
                          onPress={() => setDestinationAccountId(account.id)}
                        >
                          {account.name}
                        </Button>
                      ))}
                  </XStack>
                </YStack>
              ) : null}

              {type === 'income' || type === 'expense' ? (
                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    KATEGORI
                  </Text>
                  <XStack gap="$2" flexWrap="wrap">
                    {categories.data?.map((category) => (
                      <Button
                        key={category.id}
                        size="$3"
                        backgroundColor={categoryId === category.id ? '$primary' : '$white'}
                        color={categoryId === category.id ? '$primaryText' : '$color'}
                        borderWidth={1.5}
                        borderColor={categoryId === category.id ? '$primary' : '$borderColor'}
                        onPress={() => setCategoryId(category.id)}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </XStack>
                </YStack>
              ) : null}

              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  JUMLAH
                </Text>
                <RupiahInput value={amount} onChangeValue={setAmount} />
              </YStack>

              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$1" color="$kulit">
                  TANGGAL
                </Text>
                <XStack gap="$2">
                  <Button
                    flex={1}
                    size="$3"
                    backgroundColor={dateChoice === 'today' ? '$primary' : '$white'}
                    color={dateChoice === 'today' ? '$primaryText' : '$color'}
                    borderWidth={1.5}
                    borderColor={dateChoice === 'today' ? '$primary' : '$borderColor'}
                    onPress={() => setDateChoice('today')}
                  >
                    Hari ini
                  </Button>
                  <Button
                    flex={1}
                    size="$3"
                    backgroundColor={dateChoice === 'yesterday' ? '$primary' : '$white'}
                    color={dateChoice === 'yesterday' ? '$primaryText' : '$color'}
                    borderWidth={1.5}
                    borderColor={dateChoice === 'yesterday' ? '$primary' : '$borderColor'}
                    onPress={() => setDateChoice('yesterday')}
                  >
                    Kemarin
                  </Button>
                </XStack>
              </YStack>

              {type === 'adjustment' ? (
                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    ALASAN PENYESUAIAN
                  </Text>
                  <TextField
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Contoh: Koreksi saldo awal"
                  />
                </YStack>
              ) : (
                <YStack gap="$2">
                  <Text fontFamily="$body" fontSize="$1" color="$kulit">
                    CATATAN (OPSIONAL)
                  </Text>
                  <TextField
                    value={note}
                    onChangeText={setNote}
                  />
                </YStack>
              )}

              <Button
                backgroundColor="$primary"
                color="$primaryText"
                disabled={!canSubmit}
                opacity={canSubmit ? 1 : 0.5}
                onPress={handleSubmit}
              >
                {createTransaction.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
            </PocketCard>
          )}

          {hasAccounts ? (
            <YStack gap="$3">
              <Text fontFamily="$body" fontSize="$1" color="$kulit">
                RIWAYAT TRANSAKSI
              </Text>
              {transactions.isLoading ? (
                <YStack alignItems="center" paddingTop="$4">
                  <Spinner size="large" color="$primary" />
                </YStack>
              ) : transactions.isError ? (
                <PocketCard>
                  <Text fontFamily="$body" fontSize="$2" color="$danger">
                    Gagal memuat riwayat transaksi. Coba lagi nanti.
                  </Text>
                </PocketCard>
              ) : transactionItems.length === 0 ? (
                <PocketCard tone="muted">
                  <Text fontFamily="$body" fontSize="$2" color="$kulit" textAlign="center">
                    Belum ada transaksi. Catat transaksi pertamamu di atas.
                  </Text>
                </PocketCard>
              ) : (
                <FlatList
                  data={transactionItems}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <YStack height="$2" />}
                  renderItem={({ item }) => (
                    <TransactionListItem transaction={item} categoriesById={categoriesById} />
                  )}
                  onEndReached={() => {
                    if (transactions.hasNextPage && !transactions.isFetchingNextPage) {
                      transactions.fetchNextPage()
                    }
                  }}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={
                    transactions.isFetchingNextPage ? (
                      <YStack alignItems="center" paddingVertical="$3">
                        <Spinner color="$primary" />
                      </YStack>
                    ) : null
                  }
                />
              )}
            </YStack>
          ) : null}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  )
}
