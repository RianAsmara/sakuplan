import { useMemo, useState } from "react";
import { FlatList, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input, ScrollView, Spinner, XStack, YStack } from "tamagui";
import { AddAccountCard } from "../../../src/accounts/AddAccountCard";
import { useAccounts } from "../../../src/accounts/useAccounts";
import type { components } from "../../../src/api/client";
import { ApiError } from "../../../src/api/errors";
import { useCategories } from "../../../src/categories/useCategories";
import {
  Amount,
  BodyS,
  ButtonLabel,
  Chip,
  ChipLabel,
  FieldLabel,
  Meta,
  PrimaryButton,
  Screen,
  SectionHeading,
  SegmentButton,
  SegmentLabel,
  inputStyle,
} from "../../../src/components/primitives";
import { TabHeader } from "../../../src/components/AppHeader";
import { TextField } from "../../../src/components/TextField";
import { daysAgo, toRFC3339 } from "../../../src/format/date";
import { formatRupiah } from "../../../src/format/money";
import { TransactionListItem } from "../../../src/transactions/TransactionListItem";
import { useCreateTransaction } from "../../../src/transactions/useCreateTransaction";
import { useInfiniteTransactions } from "../../../src/transactions/useInfiniteTransactions";

type CreateTransactionType = components["schemas"]["CreateTransactionType"];

const TYPE_LABELS: Record<CreateTransactionType, string> = {
  income: "Pemasukan",
  expense: "Pengeluaran",
  transfer: "Transfer",
  adjustment: "Penyesuaian",
};

export default function TransactionsScreen() {
  const accounts = useAccounts();
  const [type, setType] = useState<CreateTransactionType>("expense");
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [destinationAccountId, setDestinationAccountId] = useState<
    string | undefined
  >(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [dateChoice, setDateChoice] = useState<"today" | "yesterday">("today");

  // STATES.md: category chips only render for expense; income is forced onto
  // its (single) income category with no chip UI at all.
  const categories = useCategories(
    type === "income" || type === "expense" ? type : undefined,
  );
  const createTransaction = useCreateTransaction();
  const allCategories = useCategories();
  const transactions = useInfiniteTransactions();
  const categoriesById = useMemo(
    () =>
      new Map(
        (allCategories.data ?? []).map((category) => [category.id, category]),
      ),
    [allCategories.data],
  );
  const accountsById = useMemo(
    () => new Map((accounts.data ?? []).map((account) => [account.id, account])),
    [accounts.data],
  );

  const transactionItems =
    transactions.data?.pages.flatMap((page) => page.data) ?? [];

  const hasAccounts = (accounts.data?.length ?? 0) > 0;
  // SCREENS.md §2: savings accounts cannot fund a transaction.
  const spendableAccounts = accounts.data?.filter((a) => a.spendable) ?? [];
  const canOfferTransfer = spendableAccounts.length >= 2;
  const availableTypes: CreateTransactionType[] = canOfferTransfer
    ? ["income", "expense", "transfer", "adjustment"]
    : ["income", "expense", "adjustment"];

  const isConflict =
    createTransaction.error instanceof ApiError &&
    createTransaction.error.status === 409;

  // Category chips are hidden for income (STATES.md) — derive the (only)
  // income category from the query directly rather than mirroring it into
  // state, so it's correct the instant the income query resolves.
  const effectiveCategoryId =
    type === "income" ? categories.data?.[0]?.id : categoryId;

  const canSubmit = (() => {
    if (!accountId || amount <= 0 || createTransaction.isPending) return false;
    if (type === "income" || type === "expense") return !!effectiveCategoryId;
    if (type === "transfer")
      return !!destinationAccountId && destinationAccountId !== accountId;
    if (type === "adjustment") return reason.trim().length > 0;
    return false;
  })();

  function handleSubmit() {
    if (!accountId) return;
    const occurredAt = toRFC3339(
      dateChoice === "today" ? new Date() : daysAgo(new Date(), 1),
    );
    createTransaction.mutate(
      {
        type,
        account_id: accountId,
        destination_account_id:
          type === "transfer" ? destinationAccountId : undefined,
        category_id:
          type === "income" || type === "expense"
            ? effectiveCategoryId
            : undefined,
        amount,
        occurred_at: occurredAt,
        note: note.trim() || undefined,
        reason: type === "adjustment" ? reason.trim() : undefined,
      },
      {
        onSuccess: () => {
          setAmount(0);
          setNote("");
          setReason("");
        },
      },
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8F4" }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Screen gap="$4">
            <TabHeader title="Transaksi" />

            {accounts.isLoading ? (
              <YStack alignItems="center" paddingTop="$6">
                <Spinner size="large" color="$terjaga" />
              </YStack>
            ) : !hasAccounts ? (
              <AddAccountCard />
            ) : (
              <>
                {isConflict ? (
                  <YStack
                    backgroundColor="$peringatanFill"
                    borderLeftWidth={3}
                    borderLeftColor="$peringatan"
                    borderRadius="$1.5"
                    paddingHorizontal="$3"
                    paddingVertical="$2.5"
                  >
                    <BodyS color="$tinta">
                      Transaksi ini sepertinya sudah tersimpan. Periksa riwayat
                      di bawah.
                    </BodyS>
                  </YStack>
                ) : createTransaction.isError ? (
                  <YStack
                    backgroundColor="$peringatanFill"
                    borderLeftWidth={3}
                    borderLeftColor="$peringatan"
                    borderRadius="$1.5"
                    paddingHorizontal="$3"
                    paddingVertical="$2.5"
                  >
                    <BodyS color="$tinta">
                      Gagal menyimpan transaksi. Coba lagi.
                    </BodyS>
                  </YStack>
                ) : null}

                <XStack gap="$2" flexWrap="wrap">
                  {availableTypes.map((option) => (
                    <SegmentButton
                      key={option}
                      selected={type === option}
                      flexBasis={availableTypes.length > 2 ? "47%" : undefined}
                      onPress={() => {
                        setType(option);
                        setCategoryId(undefined);
                      }}
                    >
                      <SegmentLabel selected={type === option}>
                        {TYPE_LABELS[option]}
                      </SegmentLabel>
                    </SegmentButton>
                  ))}
                </XStack>
                {!canOfferTransfer ? (
                  <Meta>Tambahkan satu akun lagi untuk bisa mencatat transfer.</Meta>
                ) : null}

                <XStack alignItems="center" {...inputStyle}>
                  <Amount size={26} color="$kulit" marginRight="$1.5">
                    Rp
                  </Amount>
                  <Input
                    unstyled
                    flex={1}
                    fontFamily="$mono"
                    fontWeight="500"
                    fontSize={26}
                    color="$tinta"
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="$kulit"
                    value={amount === 0 ? "" : formatRupiah(amount).replace("Rp", "")}
                    onChangeText={(text) =>
                      setAmount(Number.parseInt(text.replace(/[^0-9]/g, ""), 10) || 0)
                    }
                  />
                </XStack>

                <YStack gap="$2">
                  <FieldLabel htmlFor="tx-account">AKUN</FieldLabel>
                  <XStack gap="$2" flexWrap="wrap">
                    {spendableAccounts.map((account) => (
                      <Chip
                        key={account.id}
                        selected={accountId === account.id}
                        hitSlop={8}
                        onPress={() => setAccountId(account.id)}
                      >
                        <ChipLabel selected={accountId === account.id}>
                          {account.name}
                        </ChipLabel>
                      </Chip>
                    ))}
                  </XStack>
                </YStack>

                {type === "transfer" ? (
                  <YStack gap="$2">
                    <FieldLabel htmlFor="tx-destination">AKUN TUJUAN</FieldLabel>
                    <XStack gap="$2" flexWrap="wrap">
                      {spendableAccounts
                        .filter((account) => account.id !== accountId)
                        .map((account) => (
                          <Chip
                            key={account.id}
                            selected={destinationAccountId === account.id}
                            hitSlop={8}
                            onPress={() => setDestinationAccountId(account.id)}
                          >
                            <ChipLabel selected={destinationAccountId === account.id}>
                              {account.name}
                            </ChipLabel>
                          </Chip>
                        ))}
                    </XStack>
                  </YStack>
                ) : null}

                {type === "expense" ? (
                  <YStack gap="$2">
                    <FieldLabel htmlFor="tx-category">KATEGORI</FieldLabel>
                    <XStack gap="$2" flexWrap="wrap">
                      {categories.data?.map((category) => (
                        <Chip
                          key={category.id}
                          selected={categoryId === category.id}
                          hitSlop={8}
                          onPress={() => setCategoryId(category.id)}
                        >
                          <ChipLabel selected={categoryId === category.id}>
                            {category.name}
                          </ChipLabel>
                        </Chip>
                      ))}
                    </XStack>
                  </YStack>
                ) : null}

                <YStack gap="$2">
                  <FieldLabel htmlFor="tx-date">TANGGAL</FieldLabel>
                  <XStack gap="$2">
                    <SegmentButton
                      selected={dateChoice === "today"}
                      onPress={() => setDateChoice("today")}
                    >
                      <SegmentLabel selected={dateChoice === "today"}>
                        Hari ini
                      </SegmentLabel>
                    </SegmentButton>
                    <SegmentButton
                      selected={dateChoice === "yesterday"}
                      onPress={() => setDateChoice("yesterday")}
                    >
                      <SegmentLabel selected={dateChoice === "yesterday"}>
                        Kemarin
                      </SegmentLabel>
                    </SegmentButton>
                  </XStack>
                </YStack>

                {type === "adjustment" ? (
                  <YStack gap="$2">
                    <FieldLabel htmlFor="tx-reason">ALASAN PENYESUAIAN</FieldLabel>
                    <TextField
                      id="tx-reason"
                      value={reason}
                      onChangeText={setReason}
                      placeholder="Contoh: Koreksi saldo awal"
                      {...inputStyle}
                    />
                  </YStack>
                ) : (
                  <YStack gap="$2">
                    <FieldLabel htmlFor="tx-note">CATATAN (OPSIONAL)</FieldLabel>
                    <TextField
                      id="tx-note"
                      value={note}
                      onChangeText={setNote}
                      {...inputStyle}
                    />
                  </YStack>
                )}

                <PrimaryButton
                  marginBottom="$6"
                  opacity={canSubmit ? 1 : 0.5}
                  disabled={!canSubmit}
                  accessibilityState={{ disabled: !canSubmit }}
                  onPress={handleSubmit}
                >
                  <ButtonLabel color="$putih">
                    {createTransaction.isPending ? "Menyimpan..." : "Simpan"}
                  </ButtonLabel>
                </PrimaryButton>
              </>
            )}

            {hasAccounts ? (
              <YStack gap="$3">
                <SectionHeading>Riwayat</SectionHeading>
                {transactions.isLoading ? (
                  <YStack alignItems="center" paddingTop="$4">
                    <Spinner size="large" color="$terjaga" />
                  </YStack>
                ) : transactions.isError ? (
                  <Meta color="$peringatan">
                    Gagal memuat riwayat transaksi. Coba lagi nanti.
                  </Meta>
                ) : transactionItems.length === 0 ? (
                  <Meta textAlign="center">
                    Belum ada transaksi. Catat transaksi pertamamu di atas.
                  </Meta>
                ) : (
                  <FlatList
                    data={transactionItems}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TransactionListItem
                        transaction={item}
                        categoriesById={categoriesById}
                        accountsById={accountsById}
                      />
                    )}
                    onEndReached={() => {
                      if (
                        transactions.hasNextPage &&
                        !transactions.isFetchingNextPage
                      ) {
                        transactions.fetchNextPage();
                      }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                      transactions.isFetchingNextPage ? (
                        <YStack alignItems="center" paddingVertical="$3">
                          <Spinner color="$terjaga" />
                        </YStack>
                      ) : null
                    }
                  />
                )}
              </YStack>
            ) : null}
          </Screen>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
