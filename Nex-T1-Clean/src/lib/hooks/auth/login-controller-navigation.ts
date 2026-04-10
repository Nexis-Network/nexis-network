type RouterLike = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

export function navigateTo(router: RouterLike, href: string): void {
  if (typeof window === "undefined") {
    router.replace(href);
    return;
  }
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) {
      window.location.assign(url.toString());
      return;
    }
    router.replace(url.pathname + url.search + url.hash);
  } catch {
    window.location.assign(href);
  }
}

export function stripOAuthSearchParams(router: RouterLike, target: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = new URL(window.location.href);
    const targetUrl = new URL(target, window.location.origin);
    if (current.pathname !== targetUrl.pathname) return;
    let paramsChanged = false;
    if (current.searchParams.has("code")) {
      current.searchParams.delete("code");
      paramsChanged = true;
    }
    if (current.searchParams.has("state")) {
      current.searchParams.delete("state");
      paramsChanged = true;
    }
    if (!paramsChanged) return;
    const normalized =
      current.pathname +
      (current.searchParams.size ? `?${current.searchParams.toString()}` : "") +
      current.hash;
    router.replace(normalized, { scroll: false });
  } catch {
    // Ignore URL parsing failures and fall back to navigation.
  }
}
