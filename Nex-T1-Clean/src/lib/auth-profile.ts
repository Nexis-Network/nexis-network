export type AuthIdentifierType = "email" | "wallet" | "ens" | "username";

export type AuthIdentifier = {
  value: string;
  type: AuthIdentifierType;
};

const STORAGE_KEY = "supabase-auth-identifier";
export const AUTH_IDENTIFIER_EVENT = "supabase-auth:identifier-change";

function safeDispatch() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_IDENTIFIER_EVENT));
}

export function storeAuthIdentifier(value: string, type: AuthIdentifierType = "email") {
  if (typeof window === "undefined") return;
  try {
    const payload: AuthIdentifier = { value, type };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    safeDispatch();
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

export function getStoredAuthIdentifier(): AuthIdentifier | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthIdentifier;
    if (parsed && typeof parsed.value === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearAuthIdentifier() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  safeDispatch();
}

