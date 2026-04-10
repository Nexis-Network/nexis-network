import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants";

// Route visitors through auth so we can preserve a post-login redirect to the app.
const landingLoginHref = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

export const primaryNavLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "Token", href: "/nzt" },
  { label: "Blog", href: "/blog" },
  { label: "Try Nex", href: landingLoginHref, variant: "cta" as const },
] as const;
