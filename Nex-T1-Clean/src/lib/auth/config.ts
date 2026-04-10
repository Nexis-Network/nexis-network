export type AuthProviderConfig = {
    id: string;
    label: string;
    scopes?: string;
    queryParams?: Record<string, string>;
};

export const PROVIDER_CONFIG: Record<string, AuthProviderConfig> = {
    google: {
        id: "google",
        label: "Google",
        scopes: "openid email profile",
        queryParams: {
            access_type: "offline",
            prompt: "consent",
        },
    },
    github: {
        id: "github",
        label: "GitHub",
        scopes: "read:user user:email",
        queryParams: {
            allow_signup: "true",
        },
    },
    discord: {
        id: "discord",
        label: "Discord",
        scopes: "identify email",
    },
    x: {
        id: "x",
        label: "X / Twitter",
        scopes: "users.read users.email tweet.read",
    },
    apple: {
        id: "apple",
        label: "Apple",
        // Subbase will handle the scope and response type natively
    },
};

export const PROVIDER_ALIASES: Record<string, string> = {
    google_oauth: "google",
    github_oauth: "github",
    discord_oauth: "discord",
    twitter: "x",
    twitter_oauth: "x",
    x: "x",
    x_oauth: "x",
    "x.com": "x",
    "x-twitter": "x",
    apple_oauth: "apple",
};

export function getProviderConfig(
    providerId: string,
): AuthProviderConfig | null {
    if (!providerId) return null;
    const normalizedId = providerId.toLowerCase();
    const canonicalId = PROVIDER_ALIASES[normalizedId] || normalizedId;
    return PROVIDER_CONFIG[canonicalId] || null;
}
