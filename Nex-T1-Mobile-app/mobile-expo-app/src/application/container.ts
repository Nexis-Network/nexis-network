/**
 * Dependency Injection Container
 *
 * Provides a type-safe singleton container with lazy initialization.
 * All repository implementations are registered here and resolved by
 * use cases and hooks via `ServiceKeys`.
 *
 * @example
 * ```ts
 * const authRepo = container.resolve<IAuthRepository>(ServiceKeys.AuthRepository);
 * ```
 */

import type { IAuthRepository } from '@domain/auth/repositories/auth-repository';
import type { IWalletRepository, IWalletManager } from '@domain/wallet/repositories/wallet-repository';
import type { IChatRepository } from '@domain/chat/repositories/chat-repository';
import type { IAgentRepository } from '@domain/agent/repositories/agent-repository';
import type { IMarketRepository } from '@domain/market/repositories/market-repository';
import type { ITradingRepository } from '@domain/trading/repositories/trading-repository';
import type { ISecureStorage } from '@domain/common/ports/secure-storage';
import type { ICrossmintWalletService } from '@domain/wallet/ports/crossmint-wallet-service';
import type { Result } from '@domain/common/types';
import type { DomainError } from '@domain/common/errors/domain-error';

// ---------------------------------------------------------------------------
// IBiometricService — application-level port for biometric operations
// ---------------------------------------------------------------------------

/**
 * Port for biometric authentication.
 * Infrastructure adapters (expo-local-authentication) provide the implementation.
 */
export interface IBiometricService {
  /** Whether biometrics are enrolled and available on the device. */
  isAvailable(): Promise<boolean>;

  /**
   * Prompt the user for biometric authentication.
   * Resolves `true` on success, `false` on user cancel.
   */
  authenticate(reason: string): Promise<Result<boolean, DomainError>>;
}

// ---------------------------------------------------------------------------
// Service keys — unique symbols for type-safe resolution
// ---------------------------------------------------------------------------

/**
 * Phantom `unique symbol` declarations.
 *
 * `Symbol.for()` returns the generic `symbol` type, which can't be used
 * as a computed property in an interface.  By declaring phantom unique
 * symbols and casting, each key gets a distinct type at the type level
 * while remaining a normal `Symbol.for()` value at runtime.
 */
declare const _AuthRepository: unique symbol;
declare const _WalletRepository: unique symbol;
declare const _WalletManager: unique symbol;
declare const _ChatRepository: unique symbol;
declare const _AgentRepository: unique symbol;
declare const _MarketRepository: unique symbol;
declare const _TradingRepository: unique symbol;
declare const _SecureStorage: unique symbol;
declare const _BiometricService: unique symbol;
declare const _CrossmintWalletService: unique symbol;

/**
 * Registry of all injectable service keys.
 * Using `Symbol` guarantees uniqueness and prevents string collisions.
 */
export const ServiceKeys = {
  // Repositories
  AuthRepository: Symbol.for('AuthRepository') as typeof _AuthRepository,
  WalletRepository: Symbol.for('WalletRepository') as typeof _WalletRepository,
  WalletManager: Symbol.for('WalletManager') as typeof _WalletManager,
  ChatRepository: Symbol.for('ChatRepository') as typeof _ChatRepository,
  AgentRepository: Symbol.for('AgentRepository') as typeof _AgentRepository,
  MarketRepository: Symbol.for('MarketRepository') as typeof _MarketRepository,
  TradingRepository: Symbol.for('TradingRepository') as typeof _TradingRepository,

  // Infrastructure services
  SecureStorage: Symbol.for('SecureStorage') as typeof _SecureStorage,
  BiometricService: Symbol.for('BiometricService') as typeof _BiometricService,
  CrossmintWalletService: Symbol.for('CrossmintWalletService') as typeof _CrossmintWalletService,
} as const;

/**
 * Type map that associates each service key with its resolved interface.
 * This enables fully type-safe resolution without manual casts.
 */
export interface ServiceMap {
  readonly [ServiceKeys.AuthRepository]: IAuthRepository;
  readonly [ServiceKeys.WalletRepository]: IWalletRepository;
  readonly [ServiceKeys.WalletManager]: IWalletManager;
  readonly [ServiceKeys.ChatRepository]: IChatRepository;
  readonly [ServiceKeys.AgentRepository]: IAgentRepository;
  readonly [ServiceKeys.MarketRepository]: IMarketRepository;
  readonly [ServiceKeys.TradingRepository]: ITradingRepository;
  readonly [ServiceKeys.SecureStorage]: ISecureStorage;
  readonly [ServiceKeys.BiometricService]: IBiometricService;
  readonly [ServiceKeys.CrossmintWalletService]: ICrossmintWalletService;
}

// ---------------------------------------------------------------------------
// Factory type
// ---------------------------------------------------------------------------

/**
 * A factory function that produces a service instance.
 * Receives the container itself so factories can resolve their own dependencies.
 */
type ServiceFactory<T> = (container: ServiceContainer) => T;

// ---------------------------------------------------------------------------
// Service container
// ---------------------------------------------------------------------------

/**
 * Singleton dependency injection container with lazy initialization.
 *
 * Services are registered as factories and instantiated on first `resolve()`
 * call. Subsequent calls return the cached instance.
 */
export class ServiceContainer {
  private static _instance: ServiceContainer | undefined;

  /** Registered factory functions keyed by symbol. */
  private readonly _factories = new Map<symbol, ServiceFactory<unknown>>();

  /** Lazily-instantiated service singletons. */
  private readonly _instances = new Map<symbol, unknown>();

  /** Use `ServiceContainer.getInstance()` instead. */
  private constructor() {}

  /**
   * Return the global singleton container instance.
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer._instance) {
      ServiceContainer._instance = new ServiceContainer();
    }
    return ServiceContainer._instance;
  }

  /**
   * Register a service factory under the given key.
   *
   * @param key     - A unique symbol from `ServiceKeys`.
   * @param factory - A function that produces the service, optionally resolving
   *                  other dependencies from the container.
   */
  register<K extends symbol>(key: K, factory: ServiceFactory<unknown>): this {
    this._factories.set(key, factory);
    // Evict any previously cached instance so the new factory takes effect.
    this._instances.delete(key);
    return this;
  }

  /**
   * Resolve a registered service.
   *
   * On the first call the factory is invoked and the resulting instance is
   * cached. Subsequent calls return the cached instance (lazy singleton).
   *
   * @throws Error if no factory has been registered for the key.
   */
  resolve<K extends keyof ServiceMap>(key: K): ServiceMap[K];
  resolve<T>(key: symbol): T;
  resolve(key: symbol): unknown {
    // Return cached instance when available.
    const cached = this._instances.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const factory = this._factories.get(key);
    if (!factory) {
      throw new Error(
        `[ServiceContainer] No factory registered for key: ${String(key)}. ` +
          'Did you forget to call container.register()?',
      );
    }

    const instance = factory(this);
    this._instances.set(key, instance);
    return instance;
  }

  /**
   * Check whether a factory has been registered for the given key.
   */
  has(key: symbol): boolean {
    return this._factories.has(key);
  }

  /**
   * Remove all registered factories and cached instances.
   * Useful for testing or hot-reload scenarios.
   */
  reset(): void {
    this._factories.clear();
    this._instances.clear();
  }

  /**
   * Reset the singleton instance itself.
   * Only intended for test isolation.
   */
  static resetInstance(): void {
    ServiceContainer._instance = undefined;
  }
}

// ---------------------------------------------------------------------------
// Convenience export
// ---------------------------------------------------------------------------

/**
 * The global DI container singleton.
 */
export const container = ServiceContainer.getInstance();
