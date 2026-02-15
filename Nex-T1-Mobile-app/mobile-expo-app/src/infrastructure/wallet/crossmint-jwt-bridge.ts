/**
 * Crossmint JWT Bridge
 *
 * Retrieves the current Supabase access token from ISecureStorage so that
 * Crossmint's "Bring Your Own Auth" (BYOA) flow can use it as the owner JWT
 * when creating or resolving smart wallets.
 *
 * IMPORTANT: ISecureStorage.getItem() returns `Result<string | null, DomainError>`,
 * not a raw string. This bridge unwraps the Result properly and converts
 * null (no token stored) into a typed domain failure.
 */

import type { Result } from '@domain/common/types';
import { success, failure } from '@domain/common/types';
import { DomainError } from '@domain/common/errors/domain-error';
import type { ISecureStorage } from '@domain/common/ports/secure-storage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The SecureStore key under which Supabase persists the access token. */
const ACCESS_TOKEN_KEY = 'access_token';

// ---------------------------------------------------------------------------
// CrossmintJwtBridge
// ---------------------------------------------------------------------------

export class CrossmintJwtBridge {
  constructor(private readonly secureStorage: ISecureStorage) {}

  /**
   * Retrieve the current Supabase JWT for Crossmint BYOA authentication.
   *
   * @returns A `Result` containing the JWT string on success, or a
   *          `DomainError` if the token is missing or storage fails.
   */
  async getJwt(): Promise<Result<string, DomainError>> {
    try {
      const result = await this.secureStorage.getItem(ACCESS_TOKEN_KEY);

      // Storage itself returned an error (e.g. SecureStore unavailable).
      if (!result.ok) {
        return result;
      }

      // Token is null — user is not logged in.
      if (result.value === null) {
        return failure(
          new DomainError(
            'No access token found in secure storage. User may not be logged in.',
            'JWT_NOT_FOUND',
          ),
        );
      }

      return success(result.value);
    } catch (err) {
      return failure(
        new DomainError(
          `Failed to retrieve JWT: ${err instanceof Error ? err.message : String(err)}`,
          'JWT_RETRIEVAL_ERROR',
        ),
      );
    }
  }

  /**
   * Remove the cached access token from secure storage.
   * Called on logout to ensure stale tokens are not reused.
   */
  async clearJwt(): Promise<Result<void, DomainError>> {
    try {
      const result = await this.secureStorage.removeItem(ACCESS_TOKEN_KEY);
      return result;
    } catch (err) {
      return failure(
        new DomainError(
          `Failed to clear JWT: ${err instanceof Error ? err.message : String(err)}`,
          'JWT_CLEAR_ERROR',
        ),
      );
    }
  }
}
