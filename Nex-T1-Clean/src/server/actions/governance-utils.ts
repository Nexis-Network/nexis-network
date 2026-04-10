export type WalletTransactionRow = {
  amount_usd?: number | string | null;
  fee_usd?: number | string | null;
};

export function sumDailySpendUsd(rows: WalletTransactionRow[]): number {
  let total = 0;
  for (const row of rows) {
    const amountRaw = row.amount_usd ?? 0;
    const feeRaw = row.fee_usd ?? 0;
    const amount = typeof amountRaw === "number" ? amountRaw : Number.parseFloat(String(amountRaw));
    const fee = typeof feeRaw === "number" ? feeRaw : Number.parseFloat(String(feeRaw));
    if (Number.isFinite(amount)) total += amount;
    if (Number.isFinite(fee)) total += fee;
  }
  return Number.isFinite(total) ? total : 0;
}
