/**
 * OAuth provider configurations for expo-auth-session.
 *
 * Each provider defines:
 * - authorizationEndpoint: Where the user authenticates
 * - tokenEndpoint: Where codes are exchanged (server-side)
 * - clientId: Public client ID from env
 * - scopes: Requested permissions
 */

import { makeRedirectUri } from 'expo-auth-session';
import { getEnv } from '@config/env';
import type { OAuthProvider } from '@domain/auth/entities/user';

// ---------------------------------------------------------------------------
// Redirect URI
// ---------------------------------------------------------------------------

/**
 * Generates the redirect URI for OAuth callbacks.
 * Uses the `nex-t1` scheme defined in app.json.
 */
export function getOAuthRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'nex-t1',
    path: 'auth/callback',
  });
}

// ---------------------------------------------------------------------------
// Provider discovery documents
// ---------------------------------------------------------------------------

interface OAuthProviderConfig {
  readonly clientId: string;
  readonly scopes: readonly string[];
  readonly discovery: {
    readonly authorizationEndpoint: string;
    readonly tokenEndpoint: string;
    readonly revocationEndpoint?: string;
  };
}

export function getOAuthConfig(provider: OAuthProvider): OAuthProviderConfig | null {
  const env = getEnv();

  switch (provider) {
    case 'google':
      return env.GOOGLE_CLIENT_ID
        ? {
            clientId: env.GOOGLE_CLIENT_ID,
            scopes: ['openid', 'profile', 'email'],
            discovery: {
              authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
              tokenEndpoint: 'https://oauth2.googleapis.com/token',
              revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
            },
          }
        : null;

    case 'github':
      return env.GITHUB_CLIENT_ID
        ? {
            clientId: env.GITHUB_CLIENT_ID,
            scopes: ['read:user', 'user:email'],
            discovery: {
              authorizationEndpoint: 'https://github.com/login/oauth/authorize',
              tokenEndpoint: 'https://github.com/login/oauth/access_token',
            },
          }
        : null;

    case 'discord':
      return env.DISCORD_CLIENT_ID
        ? {
            clientId: env.DISCORD_CLIENT_ID,
            scopes: ['identify', 'email'],
            discovery: {
              authorizationEndpoint: 'https://discord.com/oauth2/authorize',
              tokenEndpoint: 'https://discord.com/api/oauth2/token',
              revocationEndpoint: 'https://discord.com/api/oauth2/token/revoke',
            },
          }
        : null;

    case 'twitter':
      return env.TWITTER_CLIENT_ID
        ? {
            clientId: env.TWITTER_CLIENT_ID,
            scopes: ['users.read', 'tweet.read'],
            discovery: {
              authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
              tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
              revocationEndpoint: 'https://api.twitter.com/2/oauth2/revoke',
            },
          }
        : null;

    case 'apple':
      // Apple uses native flow, not expo-auth-session
      return null;

    default:
      return null;
  }
}
