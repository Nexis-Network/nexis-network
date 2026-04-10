import type { ChatAgentRequest } from "@/modules/chat/types";
import { stringifyChatMessageContent } from "@/modules/chat/message-content";
import { findLatestMessageByRole } from "@/modules/chat/message-search";
import { buildExecutionPreferencesAttachmentContext } from "@/modules/chat/execution-preferences";

type WalletContext = NonNullable<ChatAgentRequest["walletContext"]>;

export function extractLatestUserMessage(
  messages: ChatAgentRequest["messages"],
): string {
  return stringifyChatMessageContent(
    findLatestMessageByRole(messages, "user")?.content ?? "",
  );
}

function buildWalletAttachmentContext(
  walletContext: WalletContext,
): string | null {
  const { evm, solana, selected } = walletContext;
  const walletParts: string[] = [];

  if (selected?.address) {
    const selectedDescriptor =
      selected.platform === "solana"
        ? "Solana"
        : `EVM (Chain ID: ${selected.chainId ?? evm?.chainId ?? "unknown"})`;

    walletParts.push(
      `- Selected Wallet (${selected.kind}): ${selected.address} [${selectedDescriptor}]${selected.label ? ` "${selected.label}"` : ""}`,
    );
    walletParts.push(
      "- Use the selected wallet as the default source wallet for wallet actions unless the user explicitly asks for a different wallet.",
    );
  }

  if (evm?.address) {
    walletParts.push(
      `- EVM Connected: ${evm.address} (Chain ID: ${evm.chainId})`,
    );
  }

  if (solana?.address) {
    walletParts.push(`- Solana Connected: ${solana.address}`);
  }

  if (walletParts.length === 0) {
    return null;
  }

  return `\n\n[USER_WALLET_CONTEXT]\nThe user has connected the following wallets from the frontend:\n${walletParts.join("\n")}\nIf the user asks for portfolio analysis, use these addresses automatically.\n[/USER_WALLET_CONTEXT]`;
}

export function withWalletAttachmentContext(
  request: ChatAgentRequest,
): ChatAgentRequest {
  if (!request.walletContext) {
    return request;
  }

  const walletText = buildWalletAttachmentContext(request.walletContext);
  if (!walletText) {
    return request;
  }

  return {
    ...request,
    attachmentContext: `${request.attachmentContext ?? ""}${walletText}`,
  };
}

export function withExecutionPreferencesAttachmentContext(
  request: ChatAgentRequest,
): ChatAgentRequest {
  if (!request.executionPreferences) {
    return request;
  }

  const executionPreferencesText = buildExecutionPreferencesAttachmentContext(
    request.executionPreferences,
  );

  return {
    ...request,
    attachmentContext: `${request.attachmentContext ?? ""}${executionPreferencesText}`,
  };
}
