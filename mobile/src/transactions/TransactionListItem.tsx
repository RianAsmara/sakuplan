import { useState } from "react";
import { XStack, YStack } from "tamagui";
import type { components } from "../api/client";
import { ApiError } from "../api/errors";
import {
  Amount,
  Body,
  ButtonLabel,
  LedgerRow,
  MetaS,
  PrimaryButton,
  SecondaryButton,
  inputStyle,
} from "../components/primitives";
import { TextField } from "../components/TextField";
import { formatDateID } from "../format/date";
import { formatSignedRupiah, transactionTypeMeta } from "./transactionDisplay";
import { useReverseTransaction } from "./useReverseTransaction";

type Transaction = components["schemas"]["Transaction"];
type Category = components["schemas"]["Category"];
type Account = components["schemas"]["Account"];

interface TransactionListItemProps {
  transaction: Transaction;
  categoriesById: Map<string, Category>;
  accountsById: Map<string, Account>;
}

export function TransactionListItem({
  transaction,
  categoriesById,
  accountsById,
}: TransactionListItemProps) {
  const [showReversalForm, setShowReversalForm] = useState(false);
  const [reason, setReason] = useState("");
  const reverseTransaction = useReverseTransaction();

  const meta = transactionTypeMeta(transaction.type);
  const categoryName = transaction.category_id
    ? categoriesById.get(transaction.category_id)?.name
    : undefined;
  const accountName = accountsById.get(transaction.entries[0]?.account_id)?.name;
  const metaLine = [formatDateID(transaction.occurred_at), categoryName, accountName]
    .filter(Boolean)
    .join(" · ");
  const canReverse =
    transaction.type !== "reversal" && !transaction.reversed_by_id;
  const isConflict =
    reverseTransaction.error instanceof ApiError &&
    reverseTransaction.error.status === 409;

  return (
    <YStack>
      <LedgerRow
        pv={12}
        onPress={canReverse ? () => setShowReversalForm((v) => !v) : undefined}
      >
        <YStack flex={1} gap="$0.5">
          <Body>{transaction.note?.trim() || meta.label}</Body>
          <MetaS>{metaLine}</MetaS>
        </YStack>
        <Amount size={14} color={meta.color}>
          {formatSignedRupiah(transaction.type, transaction.amount)}
        </Amount>
      </LedgerRow>

      {canReverse && showReversalForm ? (
        <YStack gap="$2" paddingBottom="$3">
          <TextField
            placeholder="Alasan pembatalan"
            value={reason}
            onChangeText={setReason}
            {...inputStyle}
          />
          {isConflict ? (
            <MetaS color="$peringatan">Transaksi ini sudah pernah dibatalkan.</MetaS>
          ) : reverseTransaction.isError ? (
            <MetaS color="$peringatan">Gagal membatalkan transaksi. Coba lagi.</MetaS>
          ) : null}
          <XStack gap="$2">
            <PrimaryButton
              flex={1}
              backgroundColor="$peringatan"
              disabled={
                reason.trim().length === 0 || reverseTransaction.isPending
              }
              opacity={reason.trim().length === 0 ? 0.5 : 1}
              onPress={() =>
                reverseTransaction.mutate({
                  id: transaction.id,
                  reason: reason.trim(),
                })
              }
            >
              <ButtonLabel color="$putih">
                {reverseTransaction.isPending
                  ? "Membatalkan..."
                  : "Konfirmasi Pembatalan"}
              </ButtonLabel>
            </PrimaryButton>
            <SecondaryButton flex={1} onPress={() => setShowReversalForm(false)}>
              <ButtonLabel color="$tinta">Batal</ButtonLabel>
            </SecondaryButton>
          </XStack>
        </YStack>
      ) : null}
    </YStack>
  );
}
