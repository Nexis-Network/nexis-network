import { connection } from "next/server";

import { z } from "zod";

import { cookies } from "next/headers";

import { defaultEvmWalletMcpClient } from "@/server/services/mcp/evm-wallet-client";
import {
  extractEncryptedJson,
  parseEvmWalletResult,
} from "@/server/services/mcp/evm-wallet-utils";
import { persistAgentWallet, listWalletPortfolios } from "@/server/wallets/wallet-store";
import { invalidateProfileAggregate } from "@/server/profile/profile-cache";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { apiResponse } from "@/lib/api-platform";

const CreateRandomSchema = z.object({
  method: z.literal("create_random"),
  chainId: z.number().int().positive().default(1),
  providerURL: z.string().url().optional(),
  label: z.string().max(120).optional(),
  encryptWithPassword: z.string().min(8).max(128).optional(),
});

const ImportPrivateKeySchema = z.object({
  method: z.literal("import_private_key"),
  privateKey: z.string().min(32),
  chainId: z.number().int().positive().default(1),
  providerURL: z.string().url().optional(),
  label: z.string().max(120).optional(),
  encryptWithPassword: z.string().min(8).max(128).optional(),
});

const ImportMnemonicSchema = z.object({
  method: z.literal("import_mnemonic"),
  mnemonic: z.string().min(24),
  chainId: z.number().int().positive().default(1),
  providerURL: z.string().url().optional(),
  label: z.string().max(120).optional(),
  encryptWithPassword: z.string().min(8).max(128).optional(),
});

const RequestSchema = z.union([
  CreateRandomSchema,
  ImportPrivateKeySchema,
  ImportMnemonicSchema,
]);

export async function GET() {
  await connection();
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });
    if (!context?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized("Not signed in"));
    }

    const summaries = await listWalletPortfolios(String(context.userId));
    return cookieBridge.commit(apiResponse.success({ wallets: summaries }));
  } catch (error) {
    const response = apiResponse.internalError(
       error instanceof Error ? error.message : "Failed to list wallets"
    );
    return cookieBridge.commit(response);
  }
}

export async function POST(req: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });
    if (!context?.userId) {
      return cookieBridge.commit(apiResponse.unauthorized("Not signed in"));
    }

    const payload = RequestSchema.safeParse(await req.json());
    if (!payload.success) {
      return cookieBridge.commit(
        apiResponse.validationError(payload.error),
      );
    }

    const userId = String(context.userId);
    const request = payload.data;

    if (request.providerURL) {
      await defaultEvmWalletMcpClient.invoke("wallet_provider_set", {
        providerURL: request.providerURL,
      });
    }

    switch (request.method) {
      case "create_random":
        return cookieBridge.commit(await handleCreateRandom(userId, request));
      case "import_private_key":
        return cookieBridge.commit(await handleImportPrivateKey(userId, request));
      case "import_mnemonic":
        return cookieBridge.commit(await handleImportMnemonic(userId, request));
      default:
        return cookieBridge.commit(
          apiResponse.badRequest("Unsupported wallet method"),
        );
    }
  } catch (error) {
    const response = apiResponse.internalError(
       error instanceof Error ? error.message : "Wallet operation failed"
    );
    return cookieBridge.commit(response);
  }
}

async function handleCreateRandom(
  userId: string,
  request: z.infer<typeof CreateRandomSchema>,
) {
  const args: Record<string, UntypedJson> = {};
  if (request.encryptWithPassword) {
    args.password = request.encryptWithPassword;
  }

  const result = await defaultEvmWalletMcpClient.invoke(
    "wallet_create_random",
    args,
  );
  const parsed = parseEvmWalletResult(result.text);

  let encryptedJson: string | null = null;
  if (request.encryptWithPassword) {
    if (!parsed.privateKey) {
      throw new Error("MCP response did not include a private key for encryption.");
    }
    const encryptResult = await defaultEvmWalletMcpClient.invoke(
      "wallet_encrypt",
      {
        wallet: parsed.privateKey,
        password: request.encryptWithPassword,
      },
    );
    encryptedJson = extractEncryptedJson(encryptResult.text);
  }

  const stored = await persistAgentWallet(userId, {
    chainId: request.chainId,
    address: parsed.address,
    providerURL: request.providerURL,
    label: request.label ?? null,
    privateKey: parsed.privateKey,
    mnemonic: parsed.mnemonic,
    encryptedJson,
    metadata: {
      source: "created_random",
      hasEncryptedWallet: Boolean(encryptedJson),
    },
  });

  await invalidateProfileAggregate(userId).catch(() => {});
  return apiResponse.success({
    wallet: {
      id: stored.id,
      address: stored.address,
      chainId: stored.chainId,
      label: stored.label,
      providerURL: stored.providerURL,
      createdAt: stored.createdAt,
    },
  });
}

async function handleImportPrivateKey(
  userId: string,
  request: z.infer<typeof ImportPrivateKeySchema>,
) {
  const invocation = await defaultEvmWalletMcpClient.invoke(
    "wallet_from_private_key",
    { privateKey: request.privateKey },
  );

  const parsed = parseEvmWalletResult(invocation.text);

  let encryptedJson: string | null = null;
  if (request.encryptWithPassword) {
    const encryptResult = await defaultEvmWalletMcpClient.invoke(
      "wallet_encrypt",
      {
        wallet: request.privateKey,
        password: request.encryptWithPassword,
      },
    );
    encryptedJson = extractEncryptedJson(encryptResult.text);
  }

  const stored = await persistAgentWallet(userId, {
    chainId: request.chainId,
    address: parsed.address,
    providerURL: request.providerURL,
    label: request.label ?? null,
    privateKey: request.privateKey,
    mnemonic: null,
    encryptedJson,
    metadata: {
      source: "import_private_key",
      hasEncryptedWallet: Boolean(encryptedJson),
    },
  });

  await invalidateProfileAggregate(userId).catch(() => {});
  return apiResponse.success({
    wallet: {
      id: stored.id,
      address: stored.address,
      chainId: stored.chainId,
      label: stored.label,
      providerURL: stored.providerURL,
      createdAt: stored.createdAt,
    },
  });
}

async function handleImportMnemonic(
  userId: string,
  request: z.infer<typeof ImportMnemonicSchema>,
) {
  const invocation = await defaultEvmWalletMcpClient.invoke(
    "wallet_from_mnemonic",
    { mnemonic: request.mnemonic },
  );

  const parsed = parseEvmWalletResult(invocation.text);

  let encryptedJson: string | null = null;
  if (request.encryptWithPassword) {
    const encryptResult = await defaultEvmWalletMcpClient.invoke(
      "wallet_encrypt",
      {
        wallet: request.mnemonic,
        password: request.encryptWithPassword,
      },
    );
    encryptedJson = extractEncryptedJson(encryptResult.text);
  }

  const stored = await persistAgentWallet(userId, {
    chainId: request.chainId,
    address: parsed.address,
    providerURL: request.providerURL,
    label: request.label ?? null,
    privateKey: parsed.privateKey,
    mnemonic: request.mnemonic,
    encryptedJson,
    metadata: {
      source: "import_mnemonic",
      hasEncryptedWallet: Boolean(encryptedJson),
    },
  });

  await invalidateProfileAggregate(userId).catch(() => {});
  return apiResponse.success({
    wallet: {
      id: stored.id,
      address: stored.address,
      chainId: stored.chainId,
      label: stored.label,
      providerURL: stored.providerURL,
      createdAt: stored.createdAt,
    },
  });
}
