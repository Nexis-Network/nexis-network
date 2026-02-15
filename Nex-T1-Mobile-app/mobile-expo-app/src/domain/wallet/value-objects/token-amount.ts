import { ValidationError } from '@domain/common/errors/domain-error';

// ---------------------------------------------------------------------------
// TokenAmount value object
// ---------------------------------------------------------------------------

/**
 * Immutable value object representing a token amount with decimal precision.
 *
 * All arithmetic is performed on raw bigint values so that floating-point
 * rounding never corrupts on-chain amounts. The `formatted` getter returns
 * a human-readable decimal string.
 *
 * This is a pure domain type -- no framework or library imports.
 */
export class TokenAmount {
  /** Raw amount as a bigint (smallest unit, e.g. wei / lamports). */
  public readonly raw: bigint;
  /** Number of decimals for this token (e.g. 18 for ETH, 9 for SOL). */
  public readonly decimals: number;
  /** Token symbol for display purposes. */
  public readonly symbol: string;

  private constructor(raw: bigint, decimals: number, symbol: string) {
    this.raw = raw;
    this.decimals = decimals;
    this.symbol = symbol;
  }

  // -----------------------------------------------------------------------
  // Factories
  // -----------------------------------------------------------------------

  /**
   * Create from the smallest-unit raw value (e.g. wei).
   */
  static fromRaw(raw: bigint, decimals: number, symbol: string): TokenAmount {
    TokenAmount.validateDecimals(decimals);
    return new TokenAmount(raw, decimals, symbol);
  }

  /**
   * Create from a human-readable decimal string (e.g. "1.5").
   */
  static fromDecimal(value: string, decimals: number, symbol: string): TokenAmount {
    TokenAmount.validateDecimals(decimals);

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Token amount must not be empty', 'amount');
    }

    const parts = trimmed.split('.');
    if (parts.length > 2) {
      throw new ValidationError(`Invalid decimal format: "${trimmed}"`, 'amount');
    }

    const intPart = parts[0] ?? '0';
    const fracPart = (parts[1] ?? '').padEnd(decimals, '0').slice(0, decimals);

    const raw = BigInt(intPart) * 10n ** BigInt(decimals) + BigInt(fracPart);
    return new TokenAmount(raw, decimals, symbol);
  }

  // -----------------------------------------------------------------------
  // Formatting
  // -----------------------------------------------------------------------

  /**
   * Human-readable decimal string with trailing zeros trimmed.
   *
   * @example "1.05" for 1050000000000000000 raw with 18 decimals
   */
  get formatted(): string {
    return TokenAmount.formatRaw(this.raw, this.decimals);
  }

  /**
   * Chain-aware display string including the token symbol.
   *
   * @example "1.05 ETH"
   */
  get display(): string {
    return `${this.formatted} ${this.symbol}`;
  }

  /**
   * Static helper so external code can format without constructing an instance.
   */
  static formatRaw(raw: bigint, decimals: number): string {
    const isNegative = raw < 0n;
    const absolute = isNegative ? -raw : raw;
    const divisor = 10n ** BigInt(decimals);
    const intPart = absolute / divisor;
    const fracPart = absolute % divisor;

    const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');

    const result = fracStr.length > 0 ? `${intPart}.${fracStr}` : `${intPart}`;
    return isNegative ? `-${result}` : result;
  }

  // -----------------------------------------------------------------------
  // Arithmetic (returns new instances -- immutability preserved)
  // -----------------------------------------------------------------------

  add(other: TokenAmount): TokenAmount {
    TokenAmount.assertSameToken(this, other);
    return new TokenAmount(this.raw + other.raw, this.decimals, this.symbol);
  }

  subtract(other: TokenAmount): TokenAmount {
    TokenAmount.assertSameToken(this, other);
    return new TokenAmount(this.raw - other.raw, this.decimals, this.symbol);
  }

  /**
   * Multiply by a scalar (e.g. quantity). The scalar is expressed as a bigint.
   */
  multiply(scalar: bigint): TokenAmount {
    return new TokenAmount(this.raw * scalar, this.decimals, this.symbol);
  }

  /**
   * Check whether this amount is zero.
   */
  isZero(): boolean {
    return this.raw === 0n;
  }

  /**
   * Check whether this amount is greater than another.
   */
  isGreaterThan(other: TokenAmount): boolean {
    TokenAmount.assertSameToken(this, other);
    return this.raw > other.raw;
  }

  /**
   * Check whether this amount is less than another.
   */
  isLessThan(other: TokenAmount): boolean {
    TokenAmount.assertSameToken(this, other);
    return this.raw < other.raw;
  }

  /**
   * Structural equality.
   */
  equals(other: TokenAmount): boolean {
    return (
      this.raw === other.raw &&
      this.decimals === other.decimals &&
      this.symbol === other.symbol
    );
  }

  // -----------------------------------------------------------------------
  // Internal guards
  // -----------------------------------------------------------------------

  private static validateDecimals(decimals: number): void {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 77) {
      throw new ValidationError(
        `Invalid decimals value: ${decimals}. Must be an integer between 0 and 77.`,
        'decimals',
      );
    }
  }

  private static assertSameToken(a: TokenAmount, b: TokenAmount): void {
    if (a.decimals !== b.decimals || a.symbol !== b.symbol) {
      throw new ValidationError(
        `Cannot perform arithmetic on different tokens: ${a.symbol} (${a.decimals}) vs ${b.symbol} (${b.decimals})`,
        'token',
      );
    }
  }
}
