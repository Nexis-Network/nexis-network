
import { isAddress as isEVMAddress } from "viem";
import { PublicKey } from "@solana/web3.js";

export const ZERO_EVM_ADDRESS = "0x0000000000000000000000000000000000000000";
const STELLAR_CLASSIC_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/u;
const STELLAR_MUXED_ADDRESS_REGEX = /^M[A-Z2-7]{68}$/u;

/**
 * Validates if the given string is a valid EVM address.
 */
export function isValidEVMAddress(address: string): boolean {
  return isEVMAddress(address);
}

/**
 * Validates that the address is a non-zero EVM address.
 */
export function isNonZeroEVMAddress(address: string): boolean {
  if (!isEVMAddress(address)) return false;
  return address.toLowerCase() !== ZERO_EVM_ADDRESS;
}

/**
 * Validates if the given string is a valid Solana address.
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates Stellar classic (G...) and muxed (M...) addresses.
 */
export function isValidStellarAddress(address: string): boolean {
  const trimmed = address.trim().toUpperCase();
  return (
    STELLAR_CLASSIC_ADDRESS_REGEX.test(trimmed) ||
    STELLAR_MUXED_ADDRESS_REGEX.test(trimmed)
  );
}

/**
 * Formats a balance to a displayable string.
 */
export function formatBalance(balance: number | string, decimals = 4): string {
    const num = Number(balance);
    if (isNaN(num)) return "0";
    if (num === 0) return "0";
    if (num < 0.0001) return "<0.0001";
    return num.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

/**
 * Formats an address to a shortened form (0x123...456).
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.substring(0, chars + 2)}...${address.substring(
    address.length - chars
  )}`;
}
