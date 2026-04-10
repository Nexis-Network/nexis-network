import { apiResponse } from "@/lib/api-platform";
import { createApprovalRequest } from "@/lib/approvals/state-machine";
import type {
  DaoDirectoryFilters,
  DaoTreasuryActionInput,
} from "@/modules/daos/contracts";
import type { DaoRequestContext } from "@/server/daos/http";
import { requireAal2FromClaims } from "@/server/security/mfa-assurance";
import { toDaoErrorResponse } from "@/modules/daos/services/shared-service";

function toTrimmedString(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseDaoDirectoryFilters(
  searchParams: URLSearchParams,
): Partial<DaoDirectoryFilters> {
  return {
    query: toTrimmedString(searchParams.get("q")),
    category: toTrimmedString(searchParams.get("category")),
    chainFamily:
      searchParams.get("chainFamily") === "evm" ||
      searchParams.get("chainFamily") === "solana"
        ? (searchParams.get("chainFamily") as "evm" | "solana")
        : undefined,
    ownershipMode:
      searchParams.get("ownershipMode") === "user" ||
      searchParams.get("ownershipMode") === "agent" ||
      searchParams.get("ownershipMode") === "hybrid"
        ? (searchParams.get("ownershipMode") as "user" | "agent" | "hybrid")
        : undefined,
    importSource:
      searchParams.get("importSource") === "app" ||
      searchParams.get("importSource") === "imported"
        ? (searchParams.get("importSource") as "app" | "imported")
        : undefined,
    lifecycleState:
      searchParams.get("lifecycleState") === "draft" ||
      searchParams.get("lifecycleState") === "active" ||
      searchParams.get("lifecycleState") === "archived" ||
      searchParams.get("lifecycleState") === "detached"
        ? (searchParams.get("lifecycleState") as
            | "draft"
            | "active"
            | "archived"
            | "detached")
        : undefined,
    mineOnly: searchParams.get("mineOnly") === "true",
  };
}

export function maybeRequireDaoAal2(
  ctx: DaoRequestContext,
  condition: boolean,
): Response | null {
  if (!condition) {
    return null;
  }

  const assurance = requireAal2FromClaims(ctx.auth.claims);
  return assurance.ok ? null : assurance.response;
}

export function daoErrorResponse(error: unknown): Response {
  const normalized = toDaoErrorResponse(error);
  return apiResponse.error(
    normalized.code,
    normalized.message,
    normalized.status,
    normalized.details,
  );
}

export async function createDaoTreasuryApproval(options: {
  ctx: DaoRequestContext;
  daoId: string;
  action: DaoTreasuryActionInput;
  request: Request;
}): Promise<string> {
  const approval = await createApprovalRequest(
    options.ctx.userId,
    {
      toolId: "cdp_wallet",
      command: "dao_execute_treasury_action",
      args: {
        daoId: options.daoId,
        actionType: options.action.actionType,
        targetAddress: options.action.targetAddress ?? null,
        valueBaseUnits: options.action.valueBaseUnits ?? null,
        payload: options.action.payload,
      },
      preview: {
        title: options.action.title,
        description: "Treasury action requires approval before execution.",
        items: [
          { label: "DAO", value: options.daoId },
          { label: "Action", value: options.action.actionType },
          {
            label: "Target",
            value: options.action.targetAddress ?? "On-chain program action",
          },
          {
            label: "Value",
            value: options.action.valueBaseUnits ?? "0",
          },
        ],
        warnings: [
          "Treasury execution moves value or changes DAO-controlled state.",
          "Verify destination addresses, calldata, and approval scope before approving.",
        ],
      },
      operationType: "deploy",
    },
    300,
    {
      ipAddress: options.request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: options.request.headers.get("user-agent") ?? undefined,
    },
  );

  return approval.id;
}
