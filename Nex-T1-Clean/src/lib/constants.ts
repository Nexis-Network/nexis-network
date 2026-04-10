const AUTH_BASE_PATH = "/auth";
const AUTH_SIGN_IN_VIEW = "sign-in";

export const APP_DASHBOARD_PATH = "/app";

type AuthSignInOptions = {
  redirectTo?: string;
};

export function buildAuthSignInUrl(options: AuthSignInOptions = {}) {
  const params = new URLSearchParams({ view: AUTH_SIGN_IN_VIEW });
  if (options.redirectTo) {
    params.set("redirectTo", options.redirectTo);
  }
  return `${AUTH_BASE_PATH}?${params.toString()}`;
}

export const AUTH_SIGN_IN_PATH = buildAuthSignInUrl();
