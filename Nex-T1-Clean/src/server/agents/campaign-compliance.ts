import type { CompliancePolicy } from "@/server/agents/campaign";
import type { SupabaseServiceRoleClient } from "@/server/services/supabase/service-role";

type HeaderReader = Pick<Headers, "get">;

type WalletLinkRow = {
  address: string | null;
  namespace: string;
  verified_at: string | null;
};

const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;
const JURISDICTION_HEADER_KEYS = ["x-jurisdiction-country", "x-vercel-ip-country", "cf-ipcountry", "x-country-code"];

export const SANCTIONED_JURISDICTION_CODES = new Set([
  "AF",
  "BY",
  "CF",
  "CU",
  "CD",
  "IR",
  "KP",
  "RU",
  "SS",
  "SY",
]);

export type LinkedWallet = {
  address: string;
  namespace: string;
  verifiedAt: string | null;
};

export class ContributionComplianceError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ContributionComplianceError";
    this.status = status;
  }
}

export function resolveJurisdictionCountryCode(
  headers: HeaderReader,
  explicitCountryCode: string | null | undefined,
): string | null {
  const fromInput = normalizeCountryCode(explicitCountryCode);
  if (fromInput) return fromInput;

  for (const key of JURISDICTION_HEADER_KEYS) {
    const candidate = normalizeCountryCode(headers.get(key));
    if (candidate) return candidate;
  }

  return null;
}

export function isSanctionedJurisdictionCountryCode(countryCode: string | null | undefined): boolean {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) return false;
  return SANCTIONED_JURISDICTION_CODES.has(normalized);
}

export async function loadLinkedWallets(
  service: SupabaseServiceRoleClient,
  orgId: string,
  userId: string,
): Promise<LinkedWallet[]> {
  const { data, error } = await service
    .from("user_wallet_link")
    .select("address, namespace, verified_at")
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to validate wallet linkage: ${error.message}`);
  }

  const rows = (data ?? []) as WalletLinkRow[];
  return rows
    .filter((row) => typeof row.address === "string" && row.address.trim().length > 0)
    .map((row) => ({
      address: row.address!.trim(),
      namespace: String(row.namespace ?? "").toLowerCase(),
      verifiedAt: row.verified_at,
    }));
}

export function hasVerifiedWallet(wallets: LinkedWallet[]): boolean {
  return wallets.some((wallet) => Boolean(wallet.verifiedAt));
}

export async function enforceContributionCompliancePolicy(options: {
  service: SupabaseServiceRoleClient;
  orgId: string;
  userId: string;
  policy: CompliancePolicy;
  riskAcknowledged: boolean;
  jurisdictionCountryCode: string | null | undefined;
  headers: HeaderReader;
  requireWalletLookup?: boolean;
}): Promise<{ linkedWallets: LinkedWallet[]; resolvedCountryCode: string | null }> {
  if (options.policy.requireAcknowledgedRisk && !options.riskAcknowledged) {
    throw new ContributionComplianceError("Risk acknowledgement is required for this campaign.", 403);
  }

  const resolvedCountryCode = resolveJurisdictionCountryCode(options.headers, options.jurisdictionCountryCode);
  if (options.policy.blockSanctionedJurisdictions && isSanctionedJurisdictionCountryCode(resolvedCountryCode)) {
    throw new ContributionComplianceError("Contributions are restricted in your jurisdiction.", 403);
  }

  const shouldLoadWallets = options.policy.requireVerifiedWallet || Boolean(options.requireWalletLookup);
  const linkedWallets = shouldLoadWallets
    ? await loadLinkedWallets(options.service, options.orgId, options.userId)
    : [];
  if (options.policy.requireVerifiedWallet && !hasVerifiedWallet(linkedWallets)) {
    throw new ContributionComplianceError("A verified wallet is required before contributing to this campaign.", 403);
  }

  return { linkedWallets, resolvedCountryCode };
}

export function normalizeCandidateWalletAddresses(wallets: LinkedWallet[]): string[] {
  const normalized = new Set<string>();
  for (const wallet of wallets) {
    const trimmed = wallet.address.trim();
    if (!trimmed) continue;
    normalized.add(trimmed);
    normalized.add(trimmed.toLowerCase());
  }
  return Array.from(normalized);
}

export async function assertWhitelistAccessForContribution(options: {
  service: SupabaseServiceRoleClient;
  campaignId: string;
  userId: string;
  candidateWalletAddresses: string[];
}): Promise<void> {
  const { data: userEntry, error: userError } = await options.service
    .from("agent_campaign_whitelist_entry")
    .select("id")
    .eq("campaign_id", options.campaignId)
    .eq("user_id", options.userId)
    .maybeSingle();
  if (userError) {
    throw new ContributionComplianceError(`Unable to validate whitelist access: ${userError.message}`, 400);
  }
  if (userEntry?.id) {
    return;
  }

  if (options.candidateWalletAddresses.length === 0) {
    throw new ContributionComplianceError("Campaign is currently in whitelist-only phase.", 403);
  }

  const { data: walletEntry, error: walletError } = await options.service
    .from("agent_campaign_whitelist_entry")
    .select("id")
    .eq("campaign_id", options.campaignId)
    .in("wallet_address", options.candidateWalletAddresses)
    .limit(1)
    .maybeSingle();
  if (walletError) {
    throw new ContributionComplianceError(`Unable to validate whitelist wallet access: ${walletError.message}`, 400);
  }
  if (!walletEntry?.id) {
    throw new ContributionComplianceError("Campaign is currently in whitelist-only phase.", 403);
  }
}

function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!COUNTRY_CODE_PATTERN.test(trimmed)) return null;
  return trimmed.toUpperCase();
}
