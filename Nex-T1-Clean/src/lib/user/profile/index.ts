import { logger } from '@/lib/logger';

export type Identity = {
  userId: number;
  email?: string | null;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  displayName?: string | null;
  ensName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarKind?: "generated" | "uploaded" | null;
  avatarVersion?: number | null;
  locale?: string | null;
  timeZone?: string | null;
  bio?: string | null;
  metadata?: Record<string, UntypedJson> | null;
};

export type Security = {
  passwordLastChangedAt?: string | null;
  mfaEnabled: boolean;
  riskScore?: number | null;
  lastLoginAt?: string | null;
  activeSessionCount?: number | null;
};

export type WalletAssetSummary = {
  icon?: string | null;
  symbol: string;
  name?: string | null;
};

export type WalletChainSummary = {
  icon?: string | null;
  name: string;
  type?: "mainnet" | "testnet";
};

export type WalletAnalyticsPosition = {
  assetType: string;
  symbol?: string | null;
  name?: string | null;
  quantity?: number | null;
  quantityUsd?: number | null;
  costBasisUsd?: number | null;
  unrealizedPnlUsd?: number | null;
  lastPriceUsd?: number | null;
  priceChange24h?: number | null;
  contractAddress?: string | null;
  tokenId?: string | null;
  metadata?: Record<string, UntypedJson> | null;
};

export type WalletAnalyticsSummary = {
  accountId: string;
  walletId: string;
  totals: {
    valueUsd: number | null;
    nativeValueUsd: number | null;
    tokenValueUsd: number | null;
    nftValueUsd: number | null;
    costBasisUsd: number | null;
    unrealizedPnlUsd: number | null;
    change24hPercent: number | null;
  };
  positions: WalletAnalyticsPosition[];
  snapshotAt?: string | null;
};

export type WalletPortfolio = {
  walletId: string;
  walletType: "agent_generated" | "external_connected" | "ledger" | "embedded";
  walletTypeIcon?: string | null;
  providerName?: string | null;
  label?: string | null;
  customLabel?: string | null;
  change24hPercent?: number | null;
  gainLoss24hUsd?: number | null;
  topAssets: WalletAssetSummary[];
  topChains: WalletChainSummary[];
  netWorthUsd?: number | null;
  address?: string | null;
  status?: string | null;
  metadata?: Record<string, UntypedJson> | null;
  analytics?: WalletAnalyticsSummary | null;
};

export type ApiKeySummary = {
  id: number;
  name?: string | null;
  prefix: string;
  status: string;
  createdAt?: string | null;
  lastUsedAt?: string | null;
};

export type IntegrationSummary = {
  provider: string;
  status: string;
  scopes: string[];
  lastSyncedAt?: string | null;
};

export type UsageSummary = {
  chatsLast30d: number;
  artifactsLast30d: number;
  tokensPromptLast7d: number;
  tokensCompletionLast7d: number;
};

export type AlertSummary = {
  type: string;
  severity: string;
  message: string;
  createdAt: string;
  resolved: boolean;
};

export type SessionSummary = {
  sessionId: string;
  device?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastSeenAt?: string | null;
};

export type ArtifactSummary = {
  artifactId: string;
  artifactType: string;
  title?: string | null;
  createdAt: string;
  tags: string[];
};

export type ProfileAggregate = {
  identity: Identity;
  security: Security;
  wallets: WalletPortfolio[];
  apiKeys: ApiKeySummary[];
  integrations: IntegrationSummary[];
  usage: UsageSummary;
  alerts: AlertSummary[];
  sessions: SessionSummary[];
  artifacts: ArtifactSummary[];
  bio: string | null;
  locale: string | null;
};

const createEmptyUsage = (): UsageSummary => ({
  chatsLast30d: 0,
  artifactsLast30d: 0,
  tokensPromptLast7d: 0,
  tokensCompletionLast7d: 0,
});

export const createEmptyProfile = (): ProfileAggregate => ({
  identity: {
    userId: 0,
    email: null,
    emailVerified: false,
    emailVerifiedAt: null,
    displayName: null,
    ensName: null,
    username: null,
    avatarUrl: null,
    avatarSeed: null,
    avatarKind: null,
    avatarVersion: null,
    locale: null,
    timeZone: null,
    bio: null,
    metadata: null,
  },
  security: {
    mfaEnabled: false,
    passwordLastChangedAt: null,
    riskScore: null,
    lastLoginAt: null,
    activeSessionCount: null,
  },
  wallets: [],
  apiKeys: [],
  integrations: [],
  usage: createEmptyUsage(),
  alerts: [],
  sessions: [],
  artifacts: [],
  bio: null,
  locale: null,
});

const coerceBoolean = (value: UntypedJson, fallback = false) =>
  typeof value === "boolean" ? value : Boolean(value ?? fallback);

const coerceNumber = (value: UntypedJson) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const coerceString = (value: UntypedJson) =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const coerceRecord = (value: UntypedJson): Record<string, UntypedJson> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, UntypedJson>)
    : null;

const coerceNumeric = (value: UntypedJson): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const asArray = (value: UntypedJson): UntypedJson[] => (Array.isArray(value) ? value : []);

export function deriveProfileFromSession(session: UntypedJson): ProfileAggregate | null {
  const sessionRecord = coerceRecord(session);
  if (!sessionRecord) return null;

  const userRecord = coerceRecord(sessionRecord.user) ?? sessionRecord;

  const metadata = coerceRecord(userRecord.metadata ?? sessionRecord.metadata);
  const profileSettings = metadata ? coerceRecord(metadata["profile"]) : null;

  const pickString = (...values: UntypedJson[]) => {
    for (const candidate of values) {
      const coerced = coerceString(candidate);
      if (coerced) return coerced;
    }
    return null;
  };

  const identity: Identity = {
    userId: typeof userRecord.id === "number" ? (userRecord.id as number) : 0,
    email: coerceString(userRecord.email ?? sessionRecord.email),
    emailVerified: Boolean(
      userRecord.email_verified ??
      userRecord.emailVerified ??
      sessionRecord.email_verified ??
      sessionRecord.emailVerified ??
      false,
    ),
    emailVerifiedAt: pickString(
      userRecord.email_verified_at,
      userRecord.emailVerifiedAt,
      sessionRecord.email_verified_at,
      sessionRecord.emailVerifiedAt,
    ),
    displayName: coerceString(
      userRecord.display_name ??
      userRecord.name ??
      sessionRecord.display_name ??
      sessionRecord.name,
    ),
    username: pickString(userRecord.username, userRecord.handle, sessionRecord.username),
    avatarUrl: pickString(
      userRecord.image,
      userRecord.avatar_url,
      sessionRecord.image,
      sessionRecord.avatar_url,
    ),
    avatarSeed: pickString(userRecord.avatar_seed, sessionRecord.avatar_seed, metadata?.avatarSeed, profileSettings?.avatarSeed),
    avatarKind: pickString(userRecord.avatar_kind, sessionRecord.avatar_kind, metadata?.avatarKind, profileSettings?.avatarKind) as
      | "generated"
      | "uploaded"
      | null,
    avatarVersion: coerceNumeric(
      userRecord.avatar_version ??
      sessionRecord.avatar_version ??
      metadata?.avatarVersion ??
      profileSettings?.avatarVersion,
    ),
    locale: pickString(userRecord.locale, sessionRecord.locale, metadata?.locale, profileSettings?.locale),
    timeZone: pickString(
      userRecord.time_zone,
      userRecord.timezone,
      sessionRecord.time_zone,
      sessionRecord.timezone,
      metadata?.timeZone,
      metadata?.timezone,
      profileSettings?.timeZone,
      profileSettings?.timezone,
    ),
    bio: pickString(userRecord.bio, metadata?.bio, profileSettings?.bio),
    metadata,
  };

  const security: Security = {
    mfaEnabled: coerceBoolean(
      userRecord.mfa_enabled ??
      userRecord.mfaEnabled ??
      sessionRecord.mfa_enabled ??
      sessionRecord.mfaEnabled,
      false,
    ),
    passwordLastChangedAt: coerceString(
      userRecord.password_updated_at ??
      userRecord.passwordLastChangedAt ??
      sessionRecord.password_updated_at,
    ),
    riskScore: coerceNumber(sessionRecord.risk_score ?? userRecord.risk_score),
    lastLoginAt: coerceString(
      sessionRecord.last_sign_in_at ??
      sessionRecord.lastLoginAt ??
      userRecord.last_sign_in_at ??
      userRecord.lastLoginAt,
    ),
    activeSessionCount:
      typeof sessionRecord.active_session_count === "number"
        ? (sessionRecord.active_session_count as number)
        : typeof metadata?.activeSessionCount === "number"
          ? (metadata.activeSessionCount as number)
          : null,
  };

  const base = createEmptyProfile();

  return {
    ...base,
    identity,
    security,
    bio: identity.bio ?? base.bio,
    locale: identity.locale ?? base.locale,
  };
}

function normalizeIdentityPayload(value: UntypedJson): Identity {
  const base = createEmptyProfile().identity;
  const record = coerceRecord(value);
  if (!record) {
    return base;
  }

  const userIdRaw = record.userId ?? record.user_id;
  let userId = base.userId;
  if (typeof userIdRaw === "number" && Number.isFinite(userIdRaw)) {
    userId = userIdRaw;
  } else if (typeof userIdRaw === "string" && userIdRaw.trim().length > 0) {
    const parsed = Number(userIdRaw);
    if (Number.isFinite(parsed)) {
      userId = parsed;
    }
  }

  const metadata = coerceRecord(record.metadata);

  return {
    ...base,
    userId,
    email: coerceString(record.email) ?? base.email,
    emailVerified: coerceBoolean(record.emailVerified ?? record.email_verified, base.emailVerified ?? false),
    emailVerifiedAt: coerceString(record.emailVerifiedAt ?? record.email_verified_at) ?? base.emailVerifiedAt,
    displayName: coerceString(record.displayName ?? record.display_name) ?? base.displayName,
    ensName: coerceString(record.ensName ?? record.ens_name) ?? base.ensName,
    username: coerceString(record.username) ?? base.username,
    avatarUrl: coerceString(record.avatarUrl ?? record.avatar_url) ?? base.avatarUrl,
    avatarSeed: coerceString(record.avatarSeed ?? record.avatar_seed) ?? base.avatarSeed,
    avatarKind:
      (coerceString(record.avatarKind ?? record.avatar_kind) as "generated" | "uploaded" | null) ??
      base.avatarKind,
    avatarVersion: coerceNumeric(record.avatarVersion ?? record.avatar_version) ?? base.avatarVersion,
    locale: coerceString(record.locale) ?? base.locale,
    timeZone: coerceString(record.timeZone ?? record.time_zone) ?? base.timeZone,
    bio: coerceString(record.bio) ?? base.bio,
    metadata,
  };
}

function normalizeSecurityPayload(value: UntypedJson): Security {
  const base = createEmptyProfile().security;
  const record = coerceRecord(value);
  if (!record) {
    return base;
  }

  return {
    ...base,
    mfaEnabled: coerceBoolean(record.mfaEnabled ?? record.mfa_enabled, base.mfaEnabled),
    passwordLastChangedAt:
      coerceString(record.passwordLastChangedAt ?? record.password_last_changed_at) ?? base.passwordLastChangedAt,
    riskScore: coerceNumeric(record.riskScore ?? record.risk_score) ?? base.riskScore ?? null,
    lastLoginAt: coerceString(record.lastLoginAt ?? record.last_login_at) ?? base.lastLoginAt,
    activeSessionCount:
      coerceNumeric(record.activeSessionCount ?? record.active_session_count) ?? base.activeSessionCount ?? null,
  };
}

function normalizeUsagePayload(value: UntypedJson): UsageSummary {
  const base = createEmptyUsage();
  const record = coerceRecord(value);
  if (!record) {
    return base;
  }

  return {
    chatsLast30d: coerceNumeric(record.chatsLast30d ?? record.chats_last_30d) ?? base.chatsLast30d,
    artifactsLast30d: coerceNumeric(record.artifactsLast30d ?? record.artifacts_last_30d) ?? base.artifactsLast30d,
    tokensPromptLast7d: coerceNumeric(record.tokensPromptLast7d ?? record.tokens_prompt_last_7d) ?? base.tokensPromptLast7d,
    tokensCompletionLast7d:
      coerceNumeric(record.tokensCompletionLast7d ?? record.tokens_completion_last_7d) ?? base.tokensCompletionLast7d,
  };
}

function normalizeWalletPortfolios(value: UntypedJson): WalletPortfolio[] {
  const entries = asArray(value);
  const allowedTypes = new Set<WalletPortfolio["walletType"]>([
    "agent_generated",
    "external_connected",
    "ledger",
    "embedded",
  ]);

  return entries
    .map((entry) => {
      const record = coerceRecord(entry);
      if (!record) {
        return null;
      }

      const walletId = coerceString(record.walletId ?? record.wallet_id) ?? coerceString(record.id);
      if (!walletId) {
        return null;
      }

      const rawType = coerceString(record.walletType ?? record.wallet_type)?.toLowerCase();
      const walletType: WalletPortfolio["walletType"] = allowedTypes.has(rawType as UntypedJson as WalletPortfolio["walletType"])
        ? (rawType as WalletPortfolio["walletType"])
        : "external_connected";

      const resolveAssets = () =>
        asArray(record.topAssets ?? record.top_assets)
          .map((asset) => {
            const assetRecord = coerceRecord(asset);
            if (!assetRecord) {
              return null;
            }
            const symbol = coerceString(assetRecord.symbol);
            if (!symbol) {
              return null;
            }
            return {
              symbol,
              name: coerceString(assetRecord.name),
              icon: coerceString(assetRecord.icon),
            } as WalletAssetSummary;
          })
          .filter((asset): asset is WalletAssetSummary => asset !== null);

      const resolveChains = () =>
        asArray(record.topChains ?? record.top_chains)
          .map((chain) => {
            const chainRecord = coerceRecord(chain);
            if (!chainRecord) {
              return null;
            }
            const name = coerceString(chainRecord.name);
            if (!name) {
              return null;
            }
            return {
              name,
              icon: coerceString(chainRecord.icon),
              type: coerceString(chainRecord.type) as "mainnet" | "testnet" | undefined,
            } as WalletChainSummary;
          })
          .filter((chain): chain is WalletChainSummary => chain !== null);

      const analytics = normalizeWalletAnalytics(
        record.analytics ?? record.analytics_summary ?? record.analyticsSummary,
      );

      return {
        walletId,
        walletType,
        walletTypeIcon: coerceString(record.walletTypeIcon ?? record.wallet_type_icon) ?? undefined,
        providerName: coerceString(record.providerName ?? record.provider_name) ?? undefined,
        label: coerceString(record.label),
        customLabel: coerceString(record.customLabel ?? record.custom_label),
        change24hPercent: coerceNumeric(record.change24hPercent ?? record.change_24h_percent),
        gainLoss24hUsd: coerceNumeric(record.gainLoss24hUsd ?? record.gain_loss_24h_usd),
        topAssets: resolveAssets(),
        topChains: resolveChains(),
        netWorthUsd: coerceNumeric(record.netWorthUsd ?? record.net_worth_usd),
        address: coerceString(record.address) ?? undefined,
        status: coerceString(record.status) ?? "active",
        metadata: coerceRecord(record.metadata) ?? undefined,
        analytics: analytics ?? undefined,
      } as WalletPortfolio;
    })
    .filter((entry): entry is WalletPortfolio => entry !== null);
}

function normalizeWalletAnalytics(value: UntypedJson): WalletAnalyticsSummary | null {
  const record = coerceRecord(value);
  if (!record) {
    return null;
  }

  const accountId = coerceString(record.accountId ?? record.account_id);
  const walletId = coerceString(record.walletId ?? record.wallet_id);
  if (!accountId || !walletId) {
    return null;
  }

  const totalsRecord = coerceRecord(record.totals);
  const totals = {
    valueUsd: coerceNumeric(totalsRecord?.valueUsd ?? totalsRecord?.value_usd),
    nativeValueUsd: coerceNumeric(totalsRecord?.nativeValueUsd ?? totalsRecord?.native_value_usd),
    tokenValueUsd: coerceNumeric(totalsRecord?.tokenValueUsd ?? totalsRecord?.token_value_usd),
    nftValueUsd: coerceNumeric(totalsRecord?.nftValueUsd ?? totalsRecord?.nft_value_usd),
    costBasisUsd: coerceNumeric(totalsRecord?.costBasisUsd ?? totalsRecord?.cost_basis_usd),
    unrealizedPnlUsd: coerceNumeric(totalsRecord?.unrealizedPnlUsd ?? totalsRecord?.unrealized_pnl_usd),
    change24hPercent: coerceNumeric(totalsRecord?.change24hPercent ?? totalsRecord?.change_24h_percent),
  };

  const positions = asArray(record.positions ?? record.assets)
    .map((entry) => normalizeWalletAnalyticsPosition(entry))
    .filter((entry): entry is WalletAnalyticsPosition => entry !== null);

  return {
    accountId,
    walletId,
    totals,
    positions,
    snapshotAt: coerceString(record.snapshotAt ?? record.snapshot_at),
  };
}

function normalizeWalletAnalyticsPosition(value: UntypedJson): WalletAnalyticsPosition | null {
  const record = coerceRecord(value);
  if (!record) {
    return null;
  }

  return {
    assetType: coerceString(record.assetType ?? record.asset_type) ?? "other",
    symbol: coerceString(record.symbol),
    name: coerceString(record.name),
    quantity: coerceNumeric(record.quantity),
    quantityUsd: coerceNumeric(record.quantityUsd ?? record.quantity_usd),
    costBasisUsd: coerceNumeric(record.costBasisUsd ?? record.cost_basis_usd),
    unrealizedPnlUsd: coerceNumeric(record.unrealizedPnlUsd ?? record.unrealized_pnl_usd),
    lastPriceUsd: coerceNumeric(record.lastPriceUsd ?? record.last_price_usd),
    priceChange24h: coerceNumeric(record.priceChange24h ?? record.price_change_24h),
    contractAddress: coerceString(record.contractAddress ?? record.contract_address),
    tokenId: coerceString(record.tokenId ?? record.token_id),
    metadata: coerceRecord(record.metadata) ?? null,
  };
}

function normalizeSessions(value: UntypedJson): SessionSummary[] {
  return asArray(value)
    .map((entry) => {
      const record = coerceRecord(entry);
      if (!record) {
        return null;
      }
      const sessionId = coerceString(record.sessionId ?? record.session_id);
      const createdAt = coerceString(record.createdAt ?? record.created_at);
      if (!sessionId || !createdAt) {
        return null;
      }
      return {
        sessionId,
        device: coerceString(record.device) ?? undefined,
        ipAddress: coerceString(record.ipAddress ?? record.ip_address) ?? undefined,
        createdAt,
        lastSeenAt: coerceString(record.lastSeenAt ?? record.last_seen_at) ?? undefined,
      } as SessionSummary;
    })
    .filter((entry): entry is SessionSummary => entry !== null);
}

function normalizeApiKeys(value: UntypedJson): ApiKeySummary[] {
  return asArray(value)
    .map((entry) => {
      const record = coerceRecord(entry);
      if (!record) {
        return null;
      }
      const id = coerceNumeric(record.id);
      const prefix = coerceString(record.prefix);
      if (id === null || !prefix) {
        return null;
      }
      return {
        id,
        name: coerceString(record.name) ?? undefined,
        prefix,
        status: coerceString(record.status) ?? "active",
        createdAt: coerceString(record.createdAt ?? record.created_at) ?? undefined,
        lastUsedAt: coerceString(record.lastUsedAt ?? record.last_used_at) ?? undefined,
      } as ApiKeySummary;
    })
    .filter((entry): entry is ApiKeySummary => entry !== null);
}

function normalizeIntegrations(value: UntypedJson): IntegrationSummary[] {
  return asArray(value)
    .map((entry) => {
      const record = coerceRecord(entry);
      if (!record) {
        return null;
      }
      const provider = coerceString(record.provider);
      if (!provider) {
        return null;
      }
      return {
        provider,
        status: coerceString(record.status) ?? "disconnected",
        scopes: asArray(record.scopes).map((scope) => coerceString(scope)).filter((scope): scope is string => Boolean(scope)),
        lastSyncedAt: coerceString(record.lastSyncedAt ?? record.last_synced_at) ?? undefined,
      } as IntegrationSummary;
    })
    .filter((entry): entry is IntegrationSummary => entry !== null);
}

function normalizeAlerts(value: UntypedJson): AlertSummary[] {
  return asArray(value)
    .map((entry) => {
      const record = coerceRecord(entry);
      if (!record) {
        return null;
      }
      const type = coerceString(record.type);
      const severity = coerceString(record.severity);
      const message = coerceString(record.message);
      const createdAt = coerceString(record.createdAt ?? record.created_at);
      if (!type || !severity || !message || !createdAt) {
        return null;
      }
      return {
        type,
        severity,
        message,
        createdAt,
        resolved: coerceBoolean(record.resolved, false),
      } as AlertSummary;
    })
    .filter((entry): entry is AlertSummary => entry !== null);
}

function normalizeArtifacts(value: UntypedJson): ArtifactSummary[] {
  return asArray(value)
    .map((entry) => {
      const record = coerceRecord(entry);
      if (!record) {
        return null;
      }
      const artifactId = coerceString(record.artifactId ?? record.artifact_id);
      const artifactType = coerceString(record.artifactType ?? record.artifact_type);
      const createdAt = coerceString(record.createdAt ?? record.created_at);
      if (!artifactId || !artifactType || !createdAt) {
        return null;
      }
      return {
        artifactId,
        artifactType,
        title: coerceString(record.title) ?? undefined,
        createdAt,
        tags: asArray(record.tags)
          .map((tag) => coerceString(tag))
          .filter((tag): tag is string => Boolean(tag)),
      } as ArtifactSummary;
    })
    .filter((entry): entry is ArtifactSummary => entry !== null);
}

export function normalizeProfileAggregate(payload: UntypedJson): ProfileAggregate {
  const base = createEmptyProfile();
  const record = coerceRecord(payload);
  if (!record) {
    return base;
  }

  const identity = normalizeIdentityPayload(record.identity);
  const security = normalizeSecurityPayload(record.security);
  const usage = normalizeUsagePayload(record.usage);
  const wallets = normalizeWalletPortfolios(record.wallets);
  const apiKeys = normalizeApiKeys(record.apiKeys ?? record.api_keys);
  const integrations = normalizeIntegrations(record.integrations);
  const alerts = normalizeAlerts(record.alerts);
  const sessions = normalizeSessions(record.sessions);
  const artifacts = normalizeArtifacts(record.artifacts);

  return {
    ...base,
    identity,
    security,
    usage,
    wallets,
    apiKeys,
    integrations,
    alerts,
    sessions,
    artifacts,
    bio: coerceString(record.bio) ?? identity.bio ?? base.bio,
    locale: coerceString(record.locale) ?? identity.locale ?? base.locale,
  };
}

async function fetchFallbackProfile(): Promise<ProfileAggregate | null> {
  try {
    const res = await fetch("/api/auth/session", {
      cache: "no-store",
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return null;
    }
    const payload = await res.json().catch(() => undefined);
    if (!payload || typeof payload !== "object") {
      return null;
    }
    // The /api/auth/session endpoint uses apiResponse.success() which wraps data as:
    // { success: true, data: { session: {...}, user: {...} } }
    const data = (payload as { data?: UntypedJson }).data ?? payload;
    const session = (data as { session?: UntypedJson }).session ?? data;
    return deriveProfileFromSession(session);
  } catch (error) {
    logger.error("profile fallback session fetch failed", error);
    return null;
  }
}

export async function fetchProfileAggregate(): Promise<ProfileAggregate> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch("/api/profile", {
      cache: "no-store",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);


    if (response.ok) {
      const json = await response.json().catch(() => ({}));
      // The /api/profile endpoint uses apiResponse.success() which wraps data as:
      // { success: true, data: { identity: {...}, wallets: [...] } }
      const data = json?.data ?? json;
      return normalizeProfileAggregate(data);
    }

    if (response.status === 404) {
      const fallback = await fetchFallbackProfile();
      if (fallback) {
        return fallback;
      }
      return createEmptyProfile();
    }

    if (response.status === 401) {
      return createEmptyProfile();
    }

    if (response.status === 408 || response.status === 503) {
      const fallback = await fetchFallbackProfile();
      if (fallback) {
        return fallback;
      }
      return createEmptyProfile();
    }

    throw new Error(`profile fetch failed: ${response.status}`);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      logger.warn("profile_fetch_timeout");
      return createEmptyProfile(); // Return empty profile on timeout to avoid blocking UI
    }
    throw error;
  }
}
