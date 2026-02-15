/**
 * useAuth Hook
 *
 * React hook that wraps all authentication use cases and exposes reactive
 * auth state via the canonical Zustand auth store. Provides sign-in, sign-up,
 * wallet auth, and sign-out operations with automatic session refresh.
 *
 * **IMPORTANT:** This hook delegates state to `useAuthStore` from
 * `@application/stores/auth-store` — the single source of truth for auth
 * state.  Earlier versions defined an inline Zustand store here, which
 * caused state split issues (ARCH-010).
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { Session, User, OAuthProvider } from '@domain/auth/entities/user';
import type { DomainError } from '@domain/common/errors/domain-error';
import type { Result } from '@domain/common/types';
import type { IAuthRepository } from '@domain/auth/repositories/auth-repository';
import type { ISecureStorage } from '@domain/common/ports/secure-storage';
import type { IWalletRepository } from '@domain/wallet/repositories/wallet-repository';

import { container, ServiceKeys } from '@application/container';
import { useAuthStore } from '@application/stores/auth-store';
import { SignInUseCase } from '@application/auth/sign-in.use-case';
import { SignUpUseCase } from '@application/auth/sign-up.use-case';
import { WalletAuthUseCase } from '@application/auth/wallet-auth.use-case';
import { SignOutUseCase } from '@application/auth/sign-out.use-case';
import { OAuthSignInUseCase } from '@application/auth/oauth-sign-in.use-case';

// ---------------------------------------------------------------------------
// Session refresh constants
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes
const REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh if expiring within 5 min

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseAuthReturn {
  /** Currently authenticated user, or null. */
  readonly user: User | null;
  /** Active session, or null. */
  readonly session: Session | null;
  /** Whether a valid session exists. */
  readonly isAuthenticated: boolean;
  /** Whether an auth operation is in progress. */
  readonly isLoading: boolean;
  /** Last auth error message, or null. */
  readonly error: string | null;

  /** Sign in with email and password. */
  signIn: (email: string, password: string) => Promise<Result<Session, DomainError>>;
  /** Register a new account. */
  signUp: (email: string, password: string, displayName: string) => Promise<Result<Session, DomainError>>;
  /** Authenticate via wallet signature. */
  signInWithWallet: (address: string, signature: string, message: string) => Promise<Result<Session, DomainError>>;
  /** Authenticate via OAuth provider (Google, GitHub, Discord, X). */
  signInWithOAuth: (
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    extras?: Record<string, string>,
  ) => Promise<Result<Session, DomainError>>;
  /** Authenticate via Apple Sign-In (convenience wrapper). */
  signInWithApple: (
    identityToken: string,
    authorizationCode: string,
  ) => Promise<Result<Session, DomainError>>;
  /** Sign out and clear all session data. */
  signOut: () => Promise<Result<void, DomainError>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): UseAuthReturn {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setError = useAuthStore((s) => s.setError);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Memoize DI resolution (ARCH-002 fix) ---
  const authRepo = useMemo(
    () => container.resolve<IAuthRepository>(ServiceKeys.AuthRepository),
    [],
  );
  const secureStorage = useMemo(
    () => container.resolve<ISecureStorage>(ServiceKeys.SecureStorage),
    [],
  );
  const walletRepo = useMemo(
    () => container.resolve<IWalletRepository>(ServiceKeys.WalletRepository),
    [],
  );

  // --- Memoize use-case instances ---
  const signInUseCase = useMemo(
    () => new SignInUseCase(authRepo, secureStorage),
    [authRepo, secureStorage],
  );
  const signUpUseCase = useMemo(
    () => new SignUpUseCase(authRepo, secureStorage),
    [authRepo, secureStorage],
  );
  const walletAuthUseCase = useMemo(
    () => new WalletAuthUseCase(authRepo, secureStorage),
    [authRepo, secureStorage],
  );
  const signOutUseCase = useMemo(
    () => new SignOutUseCase(authRepo, walletRepo, secureStorage),
    [authRepo, walletRepo, secureStorage],
  );
  const oauthSignInUseCase = useMemo(
    () => new OAuthSignInUseCase(authRepo, secureStorage),
    [authRepo, secureStorage],
  );

  // --- Session refresh ---
  const refreshSession = useCallback(async () => {
    const currentSession = useAuthStore.getState().session;
    if (!currentSession) return;

    const now = Date.now();
    const expiresAt = currentSession.expiresAt as number;

    if (expiresAt - now > REFRESH_THRESHOLD) {
      return; // Session is still fresh.
    }

    const result = await authRepo.refreshSession();
    if (result.ok) {
      setSession(result.value);
    }
  }, [authRepo, setSession]);

  // --- Initialise session on mount ---
  useEffect(() => {
    let cancelled = false;

    async function init(): Promise<void> {
      setLoading(true);
      try {
        const result = await authRepo.getSession();
        if (!cancelled && result.ok && result.value) {
          setSession(result.value);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [authRepo, setSession, setLoading]);

  // --- Auto-refresh timer ---
  useEffect(() => {
    if (isAuthenticated) {
      refreshTimerRef.current = setInterval(() => {
        void refreshSession();
      }, REFRESH_INTERVAL);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated, refreshSession]);

  // --- Actions ---
  const signIn = useCallback(
    async (email: string, password: string): Promise<Result<Session, DomainError>> => {
      setLoading(true);
      setError(null);

      const result = await signInUseCase.execute(email, password);

      if (result.ok) {
        setSession(result.value);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
      return result;
    },
    [signInUseCase, setSession, setLoading, setError],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
    ): Promise<Result<Session, DomainError>> => {
      setLoading(true);
      setError(null);

      const result = await signUpUseCase.execute(email, password, displayName);

      if (result.ok) {
        setSession(result.value);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
      return result;
    },
    [signUpUseCase, setSession, setLoading, setError],
  );

  const signInWithWallet = useCallback(
    async (
      address: string,
      signature: string,
      message: string,
    ): Promise<Result<Session, DomainError>> => {
      setLoading(true);
      setError(null);

      const result = await walletAuthUseCase.execute(address, signature, message);

      if (result.ok) {
        setSession(result.value);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
      return result;
    },
    [walletAuthUseCase, setSession, setLoading, setError],
  );

  const signInWithOAuth = useCallback(
    async (
      provider: OAuthProvider,
      code: string,
      redirectUri: string,
      extras?: Record<string, string>,
    ): Promise<Result<Session, DomainError>> => {
      setLoading(true);
      setError(null);

      const result = await oauthSignInUseCase.execute(provider, code, redirectUri, extras);

      if (result.ok) {
        setSession(result.value);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
      return result;
    },
    [oauthSignInUseCase, setSession, setLoading, setError],
  );

  const signInWithApple = useCallback(
    async (
      identityToken: string,
      authorizationCode: string,
    ): Promise<Result<Session, DomainError>> => {
      return signInWithOAuth('apple', authorizationCode, '', {
        identity_token: identityToken,
      });
    },
    [signInWithOAuth],
  );

  const signOut = useCallback(async (): Promise<Result<void, DomainError>> => {
    setLoading(true);
    setError(null);

    const result = await signOutUseCase.execute();

    // Always reset local state regardless of remote success.
    clearAuth();
    return result;
  }, [signOutUseCase, clearAuth, setLoading, setError]);

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    error,
    signIn,
    signUp,
    signInWithWallet,
    signInWithOAuth,
    signInWithApple,
    signOut,
  };
}
