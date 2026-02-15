/**
 * DI initialization for the root layout.
 *
 * Delegates to the canonical ServiceContainer in @application/container.
 * The `initializeDI()` function is called once at app startup to register
 * all infrastructure implementations.
 *
 * IMPORTANT: Infrastructure adapters are loaded lazily (inside factory
 * closures) rather than via top-level imports. This prevents WalletConnect
 * and other heavy SDKs from executing at module-evaluation time, which can
 * crash due to tslib `__extends` strict-mode incompatibility in Metro.
 */

import { container, ServiceKeys } from '@application/container';
import type { IBiometricService } from '@application/container';

// Biometric adapter dependencies (lightweight Expo SDK — safe to import eagerly)
import * as LocalAuthentication from 'expo-local-authentication';
import { success, failure } from '@domain/common/types';
import { DomainError } from '@domain/common/errors/domain-error';

// Re-export so the root layout can import from the providers barrel.
export { container };

/**
 * Lightweight `IBiometricService` backed by `expo-local-authentication`.
 *
 * Lives here (rather than its own file) because it has no external deps
 * beyond the Expo SDK and is only two methods.
 */
class ExpoBiometricService implements IBiometricService {
  async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return LocalAuthentication.isEnrolledAsync();
  }

  async authenticate(reason: string) {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      return success(result.success);
    } catch (err) {
      return failure(
        new DomainError(
          `Biometric authentication failed: ${err instanceof Error ? err.message : String(err)}`,
          'BIOMETRIC_ERROR',
        ),
      );
    }
  }
}

/** Track whether DI has already been initialized (idempotent guard). */
let _initialized = false;

/**
 * Called once at app startup (in app/_layout.tsx) to wire infrastructure
 * implementations to their domain interfaces.
 *
 * Registrations use the lazy-singleton pattern: the factory function is
 * invoked on first `container.resolve()` call and cached thereafter.
 * Infrastructure modules are loaded inside factories via `require()` to
 * avoid top-level evaluation of heavy/incompatible SDK code.
 */
export function initializeDI(): void {
  if (_initialized) return;
  _initialized = true;

  // ── Foundation services (no deps) ──────────────────────────────────
  container.register(ServiceKeys.SecureStorage, () => {
    const { ExpoSecureStorage } = require('@infrastructure/storage/secure-store') as {
      ExpoSecureStorage: new () => import('@domain/common/ports/secure-storage').ISecureStorage;
    };
    return new ExpoSecureStorage();
  });

  container.register(ServiceKeys.BiometricService, () => new ExpoBiometricService());

  // ── Repositories (may depend on foundation services) ───────────────
  container.register(ServiceKeys.AuthRepository, () => {
    const { SupabaseAuthAdapter } = require('@infrastructure/supabase/auth-adapter') as {
      SupabaseAuthAdapter: new () => import('@domain/auth/repositories/auth-repository').IAuthRepository;
    };
    return new SupabaseAuthAdapter();
  });

  container.register(ServiceKeys.WalletRepository, () => {
    const { WalletApi } = require('@infrastructure/api/wallet-api') as {
      WalletApi: new () => import('@domain/wallet/repositories/wallet-repository').IWalletRepository;
    };
    return new WalletApi();
  });

  container.register(ServiceKeys.ChatRepository, () => {
    const { ChatApi } = require('@infrastructure/api/chat-api') as {
      ChatApi: new () => import('@domain/chat/repositories/chat-repository').IChatRepository;
    };
    return new ChatApi();
  });

  container.register(ServiceKeys.AgentRepository, () => {
    const { AgentApi } = require('@infrastructure/api/agent-api') as {
      AgentApi: new () => import('@domain/agent/repositories/agent-repository').IAgentRepository;
    };
    return new AgentApi();
  });

  container.register(ServiceKeys.MarketRepository, () => {
    const { MarketApi } = require('@infrastructure/api/market-api') as {
      MarketApi: new () => import('@domain/market/repositories/market-repository').IMarketRepository;
    };
    return new MarketApi();
  });

  container.register(ServiceKeys.TradingRepository, () => {
    const { TradingApi } = require('@infrastructure/api/trading-api') as {
      TradingApi: new () => import('@domain/trading/repositories/trading-repository').ITradingRepository;
    };
    return new TradingApi();
  });

  // ── Composite services ─────────────────────────────────────────────
  container.register(ServiceKeys.WalletManager, () => {
    const { WalletManager } = require('@infrastructure/wallet/wallet-manager') as {
      WalletManager: new () => import('@domain/wallet/repositories/wallet-repository').IWalletManager;
    };
    return new WalletManager();
  });

  // ── Crossmint smart-wallet service ──────────────────────────────────
  container.register(ServiceKeys.CrossmintWalletService, () => {
    const { CrossmintWalletServiceAdapter } = require('@infrastructure/wallet/crossmint-adapter') as {
      CrossmintWalletServiceAdapter: new () => import('@domain/wallet/ports/crossmint-wallet-service').ICrossmintWalletService;
    };
    return new CrossmintWalletServiceAdapter();
  });
}
