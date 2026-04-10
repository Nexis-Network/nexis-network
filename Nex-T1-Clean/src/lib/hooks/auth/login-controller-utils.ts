export {
  WALLET_METHODS,
  isOtpAuthMethod,
  isWalletAuthMethod,
  normalizeIdentifierValue,
  normalizeInviteCode,
  resolveBeginCredentialDecision,
  resolveCredentialSubmitDecision,
  type BeginCredentialDecision,
  type CredentialSubmitDecision,
} from "./login-controller-identifier-utils";
export {
  getLoginHeader,
  isPasskeyEnabled,
  resolvePostAuthTarget,
  type AuthTranslationFn,
} from "./login-controller-view-utils";
