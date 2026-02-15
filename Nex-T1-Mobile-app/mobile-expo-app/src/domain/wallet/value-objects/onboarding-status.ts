import type { ChainType } from '@domain/wallet/entities/wallet';

export type OnboardingStep =
  | 'wallet-setup'
  | 'wallet-success'
  | 'swap-intro'
  | 'profile-setup'
  | 'complete';

export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStep> = [
  'wallet-setup',
  'wallet-success',
  'swap-intro',
  'profile-setup',
  'complete',
] as const;

export interface OnboardingStatus {
  readonly isComplete: boolean;
  readonly currentStep: OnboardingStep;
  readonly walletsCreated: ReadonlyArray<ChainType>;
  readonly failedChains: ReadonlyArray<ChainType>;
}
