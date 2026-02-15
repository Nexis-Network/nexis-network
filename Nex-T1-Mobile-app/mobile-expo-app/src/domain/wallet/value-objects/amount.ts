import { ValidationError } from '@domain/common/errors/domain-error';

// ---------------------------------------------------------------------------
// Branded type
// ---------------------------------------------------------------------------

declare const __amountBrand: unique symbol;

/**
 * A string-encoded decimal that has been validated as a positive numeric amount.
 * Token amounts are stored as strings to avoid floating-point precision loss.
 */
export type Amount = string & { readonly [__amountBrand]: true };

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const AMOUNT_RE = /^\d+(\.\d+)?$/;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const AmountVO = {
  /**
   * Validate and create a branded `Amount` value.
   *
   * @throws ValidationError when the input is not a valid positive number string.
   */
  create(value: string): Amount {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new ValidationError('Amount must not be empty', 'amount');
    }

    if (!AMOUNT_RE.test(trimmed)) {
      throw new ValidationError(`Invalid amount: "${trimmed}"`, 'amount');
    }

    const parsed = Number(trimmed);
    if (parsed <= 0) {
      throw new ValidationError('Amount must be greater than zero', 'amount');
    }

    if (!Number.isFinite(parsed)) {
      throw new ValidationError('Amount must be a finite number', 'amount');
    }

    return trimmed as Amount;
  },

  /**
   * Non-throwing validation check.
   */
  isValid(value: string): boolean {
    const trimmed = value.trim();
    if (!AMOUNT_RE.test(trimmed)) return false;
    const parsed = Number(trimmed);
    return parsed > 0 && Number.isFinite(parsed);
  },

  /**
   * Compare two amounts. Returns negative if a < b, 0 if equal, positive if a > b.
   */
  compare(a: Amount, b: Amount): number {
    return Number(a) - Number(b);
  },

  /**
   * Check whether amount `a` is greater than or equal to amount `b`.
   */
  isGte(a: Amount | string, b: Amount | string): boolean {
    return Number(a) >= Number(b);
  },
} as const;
