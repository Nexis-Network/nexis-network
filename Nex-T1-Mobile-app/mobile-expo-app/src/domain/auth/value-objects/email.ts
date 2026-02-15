import { ValidationError } from '@domain/common/errors/domain-error';

// ---------------------------------------------------------------------------
// Branded type
// ---------------------------------------------------------------------------

declare const __emailBrand: unique symbol;

/**
 * A string that has been validated as a well-formed email address.
 * Construct with `Email.create()`.
 */
export type Email = string & { readonly [__emailBrand]: true };

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * RFC 5322-inspired email regex.
 * Not exhaustive, but covers the vast majority of real-world addresses.
 */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const MAX_EMAIL_LENGTH = 254;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const EmailVO = {
  /**
   * Validate and create a branded `Email` value.
   *
   * @throws ValidationError when the input is not a valid email.
   */
  create(value: string): Email {
    const trimmed = value.trim().toLowerCase();

    if (trimmed.length === 0) {
      throw new ValidationError('Email must not be empty', 'email');
    }

    if (trimmed.length > MAX_EMAIL_LENGTH) {
      throw new ValidationError(
        `Email must not exceed ${MAX_EMAIL_LENGTH} characters`,
        'email',
      );
    }

    if (!EMAIL_RE.test(trimmed)) {
      throw new ValidationError(`Invalid email address: ${trimmed}`, 'email');
    }

    return trimmed as Email;
  },

  /**
   * Non-throwing validation check.
   */
  isValid(value: string): boolean {
    const trimmed = value.trim().toLowerCase();
    return (
      trimmed.length > 0 &&
      trimmed.length <= MAX_EMAIL_LENGTH &&
      EMAIL_RE.test(trimmed)
    );
  },
} as const;
