/**
 * OAuth Sign-In Use Case
 *
 * Orchestrates OAuth authentication by validating the provider and code,
 * delegating to IAuthRepository.signInWithOAuth, and persisting the session.
 */

import type { Result } from '@domain/common/types';
import type { DomainError } from '@domain/common/errors/domain-error';
import { ValidationError } from '@domain/common/errors/domain-error';
import type { Session, OAuthProvider } from '@domain/auth/entities/user';
import type { IAuthRepository } from '@domain/auth/repositories/auth-repository';
import type { ISecureStorage } from '@domain/common/ports/secure-storage';
import { failure, success } from '@domain/common/types';

// ---------------------------------------------------------------------------
// Valid providers
// ---------------------------------------------------------------------------

const VALID_PROVIDERS: ReadonlySet<OAuthProvider> = new Set([
  'apple',
  'google',
  'github',
  'discord',
  'twitter',
]);

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const SESSION_KEY = 'nex_session';

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

export class OAuthSignInUseCase {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly secureStorage: ISecureStorage,
  ) {}

  /**
   * Authenticate via an OAuth provider.
   *
   * 1. Validates the provider is supported.
   * 2. Validates the authorization code is non-empty.
   * 3. Delegates to IAuthRepository.signInWithOAuth().
   * 4. Persists session tokens on success.
   */
  async execute(
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    extras?: Record<string, string>,
  ): Promise<Result<Session, DomainError>> {
    // --- Validate provider ---
    if (!VALID_PROVIDERS.has(provider)) {
      return failure(
        new ValidationError(`Unsupported OAuth provider: ${provider}`, 'provider'),
      );
    }

    // --- Validate code ---
    if (!code || code.trim().length === 0) {
      return failure(
        new ValidationError('Authorization code must not be empty', 'code'),
      );
    }

    // --- Validate redirect URI ---
    if (!redirectUri || redirectUri.trim().length === 0) {
      return failure(
        new ValidationError('Redirect URI must not be empty', 'redirectUri'),
      );
    }

    // --- Authenticate via repository ---
    const result = await this.authRepository.signInWithOAuth(
      provider,
      code,
      redirectUri,
      extras,
    );

    if (!result.ok) {
      return result;
    }

    // --- Persist session tokens ---
    try {
      await this.secureStorage.setItem(SESSION_KEY, JSON.stringify({
        accessToken: result.value.accessToken,
        refreshToken: result.value.refreshToken,
        expiresAt: result.value.expiresAt,
      }));
    } catch {
      // Storage failure is non-fatal.
    }

    return success(result.value);
  }
}
