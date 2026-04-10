import type { Metadata } from "next";

import { SendSuiForm } from "@/components/wallets/send-sui-form";

export const metadata: Metadata = {
  title: "Send SUI",
  description: "Transfer Sui tokens to another address.",
};

type WalletSendPageProps = {
  searchParams?: Promise<{ chain?: string; from?: string }>;
};

export default async function WalletSendPage({ searchParams }: WalletSendPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const chain = (resolvedSearchParams?.chain ?? "sui").toLowerCase();
  const initialFrom = typeof resolvedSearchParams?.from === "string" ? resolvedSearchParams.from : null;

  if (chain !== "sui") {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-10">
        <h1 className="text-2xl font-regular">Unsupported chain</h1>
        <p className="text-sm text-muted-foreground">This flow currently supports Sui transfers only.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-regular tracking-tight">Send SUI</h1>
        <p className="mt-2 text-sm text-muted-foreground">Initiate a transfer directly from your connected Sui wallet.</p>
      </div>
      <SendSuiForm initialFrom={initialFrom} />
    </main>
  );
}
