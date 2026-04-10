import type { RequestCookie, ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse } from "next/server";

export type CookieConfig = {
  name: string;
  value: string;
  options?: Omit<ResponseCookie, "name" | "value">;
};

export type CookieBridge = {
  getAll(): RequestCookie[];
  setAll(cookiesToSet: CookieConfig[]): void;
  commit<T extends Response>(response: T): NextResponse;
  pending(): CookieConfig[];
};

export function createCookieBridge(cookieStore: { getAll(): RequestCookie[] }): CookieBridge {
  const staged = new Map<string, CookieConfig>();
  const initial = cookieStore.getAll();

  function getAll(): RequestCookie[] {
    if (staged.size === 0) {
      return initial;
    }

    const merged = new Map<string, RequestCookie>();
    initial.forEach((cookie) => {
      merged.set(cookie.name, cookie);
    });

    staged.forEach(({ name, value }) => {
      merged.set(name, { name, value } as RequestCookie);
    });

    return Array.from(merged.values());
  }

  function setAll(cookiesToSet: CookieConfig[]): void {
    cookiesToSet.forEach((cookie) => {
      staged.set(cookie.name, cookie);
    });
  }

  function commit<T extends Response>(response: T): NextResponse {
    const nextResponse =
      response instanceof NextResponse
        ? response
        : new NextResponse((response as Response & { bodyUsed?: boolean }).bodyUsed ? undefined : response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });

    staged.forEach(({ name, value, options }) => {
      nextResponse.cookies.set(name, value, options);
    });

    return nextResponse;
  }

  function pending(): CookieConfig[] {
    return Array.from(staged.values());
  }

  return {
    getAll,
    setAll,
    commit,
    pending,
  };
}

export function getCookieValue(bridge: CookieBridge, name: string): string | undefined {
  const match = bridge
    .getAll()
    .find((cookie) => cookie.name === name);
  return match?.value;
}
