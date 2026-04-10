import type { ReadonlyURLSearchParams } from "next/navigation";

import { normalizeSettingsPathname } from "./registry";

type SearchParamsLike =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | ReadonlyURLSearchParams
  | null
  | undefined;

function isSearchParamRecord(
  searchParams: SearchParamsLike,
): searchParams is Record<string, string | string[] | undefined> {
  return Boolean(
    searchParams &&
      typeof searchParams === "object" &&
      !("get" in searchParams && typeof searchParams.get === "function"),
  );
}

function pickFirstParam(searchParams: SearchParamsLike, key: string): string | null {
  if (!searchParams) return null;

  if ("get" in searchParams && typeof searchParams.get === "function") {
    const value = searchParams.get(key);
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  if (!isSearchParamRecord(searchParams)) {
    return null;
  }

  const value = searchParams[key];
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" && first.trim().length > 0 ? first.trim() : null;
  }

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function withParams(pathname: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim().length > 0) {
      query.set(key, value);
    }
  });
  const serialized = query.toString();
  return serialized.length > 0 ? `${pathname}?${serialized}` : pathname;
}

export function resolveLegacySettingsHref(pathname: string, searchParams?: SearchParamsLike): string | null {
  const normalizedPath = normalizeSettingsPathname(pathname);
  const tab = pickFirstParam(searchParams, "tab");
  const view = pickFirstParam(searchParams, "view");

  switch (normalizedPath) {
    case "/settings/account":
      switch (tab) {
        case "security":
          return "/settings/security?view=providers";
        case "connections":
          return "/settings/connections";
        case "wallets":
          return "/settings/wallets?tab=overview";
        case "portfolio":
          return "/settings/portfolio?view=overview";
        case "identity":
        default:
          return "/settings/profile?view=identity";
      }

    case "/settings/social":
      switch (tab) {
        case "messages":
          return "/settings/messages";
        case "notifications":
          return "/settings/notifications";
        case "explore":
        case "profile":
        default:
          return "/settings/profile?view=public";
      }

    case "/settings/ai":
      switch (tab) {
        case "agent-preferences":
          return withParams("/settings/agent", { view: view ?? undefined });
        case "agent-wallets":
          return "/settings/wallets?view=agentkit";
        case "artifacts":
          return withParams("/settings/artifacts", {
            view:
              view === "documents" ? "documents" : view === "pipeline" ? "knowledge" : view ?? undefined,
          });
        case "automation":
          return "/settings/automation?view=strategies";
        case "assistant":
          return "/settings/agent?view=assistant";
        case "knowledge":
          return withParams("/settings/artifacts", {
            view: view === "documents" ? "documents" : "knowledge",
          });
        case "memory":
          return "/settings/messages?view=memory";
        case "agents":
        default:
          return "/settings/agents";
      }

    case "/settings/trading":
      switch (tab) {
        case "polymarket":
          return "/settings/polymarket";
        case "agent-risk":
          return "/settings/security?view=risk";
        case "exchanges":
        default:
          return "/settings/connections?view=exchanges";
      }

    case "/settings/workspace":
      switch (tab) {
        case "projects":
          return "/settings/workspace?view=projects";
        case "launchpad":
          return "/settings/workspace?view=launchpad";
        case "billing":
          return "/settings/workspace?view=billing";
        case "rewards":
          return withParams("/settings/workspace", {
            view: "rewards",
            subview:
              view === "earn" || view === "quests" || view === "invitations"
                ? view
                : "invitations",
          });
        case "organization":
        default:
          return "/settings/workspace?view=organization";
      }

    case "/settings/developer":
      return `/settings/developer?view=${tab === "cache" ? "cache" : "api-keys"}`;

    case "/settings/account-details":
      return "/settings/profile?view=identity";
    case "/settings/profile":
      return "/settings/profile?view=public";
    case "/settings/explore":
      return "/settings/profile?view=public";
    case "/settings/messages":
      return "/settings/messages";
    case "/settings/notifications":
      return "/settings/notifications";
    case "/settings/security":
      return `/settings/security?view=${view ?? "providers"}`;
    case "/settings/connections":
      return "/settings/connections";
    case "/settings/wallets":
      return withParams("/settings/wallets", {
        tab: tab === "security" ? "security" : tab === "overview" ? "overview" : undefined,
        view: tab ? undefined : view ?? undefined,
      });
    case "/settings/solana-agentkit":
      return "/settings/solana-agentkit";
    case "/settings/coinbase-agentkit":
      return "/settings/coinbase-agentkit";
    case "/settings/portfolio":
      return withParams("/settings/portfolio", { view: view ?? "overview" });
    case "/settings/agents":
      return "/settings/agents";
    case "/settings/agent":
      return withParams("/settings/agent", { view: view ?? undefined });
    case "/settings/agent-wallets":
      return "/settings/wallets?view=agentkit";
    case "/settings/artifacts":
      return withParams("/settings/artifacts", { view: view ?? undefined });
    case "/settings/automation":
      return withParams("/settings/automation", { view: view ?? "strategies" });
    case "/settings/assistant":
      return "/settings/agent?view=assistant";
    case "/settings/documents":
      return "/settings/artifacts?view=documents";
    case "/settings/knowledge-base":
      return "/settings/artifacts?view=knowledge";
    case "/settings/memory":
      return "/settings/messages?view=memory";
    case "/settings/polymarket":
      return "/settings/polymarket";
    case "/settings/agent-spend":
      return "/settings/security?view=risk";
    case "/settings/organization":
      return "/settings/workspace?view=organization";
    case "/settings/projects":
      return "/settings/workspace?view=projects";
    case "/settings/billing":
      return "/settings/workspace?view=billing";
    case "/settings/invitations":
      return "/settings/workspace?view=rewards&subview=invitations";
    case "/settings/earn":
      return "/settings/workspace?view=rewards&subview=earn";
    case "/settings/quests":
      return "/settings/workspace?view=rewards&subview=quests";
    case "/settings/api":
      return "/settings/api";
    case "/settings/developer/products":
      return "/settings/developer?view=api-products";
    case "/settings/developer/usage":
      return "/settings/developer?view=api-usage";
    case "/settings/developer/logs":
      return "/settings/developer?view=api-logs";
    case "/settings/developer/api-keys":
      return "/settings/developer?view=api-keys";
    case "/settings/developer/cache":
      return "/settings/developer?view=cache";
    case "/settings/support":
      return "/settings/agent?view=assistant";
    default:
      return null;
  }
}
