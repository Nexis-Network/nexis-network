import {
  encodePacked,
  getAddress,
  hashMessage,
  keccak256,
  toCoinType,
  type Address,
  type Hex,
} from "viem";
import { base } from "viem/chains";

export const NEX_T1_ENS_PARENT = "nex-t1.eth" as const;

export const DEFAULT_REVERSE_REGISTRAR_ADDRESS =
  "0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb" as const satisfies Address;

export const BASE_L2_REVERSE_REGISTRAR_ADDRESS =
  "0x0000000000D8e504002cC26E3Ec46D81971C1664" as const satisfies Address;

const DEFAULT_REVERSE_SELECTOR = "0x012a67bc" as const satisfies Hex;
const BASE_REVERSE_SELECTOR = "0x2023a04c" as const satisfies Hex;
const ENS_SUBNAME_LABEL_REGEX = /^[a-z0-9-]{3,32}$/;

export type EnsSubnameLabelValidationResult =
  | { success: true; normalizedLabel: string }
  | { success: false; error: string };

export type ReverseMessageHashInput = {
  address: Address;
  expiry: bigint;
  name: string;
};

export type BaseReverseMessageHashInput = ReverseMessageHashInput & {
  coinTypes?: readonly bigint[];
};

export function validateEnsSubnameLabel(
  label: string,
): EnsSubnameLabelValidationResult {
  const normalizedLabel = label.trim();

  if (!ENS_SUBNAME_LABEL_REGEX.test(normalizedLabel)) {
    return {
      success: false,
      error:
        "Label must be 3-32 characters using lowercase letters, numbers, or hyphens.",
    };
  }

  if (
    normalizedLabel.startsWith("-") ||
    normalizedLabel.endsWith("-") ||
    normalizedLabel.includes("--")
  ) {
    return {
      success: false,
      error: "Label cannot start or end with a hyphen or contain consecutive hyphens.",
    };
  }

  return { success: true, normalizedLabel };
}

export function buildEnsFullName(label: string): string {
  return `${label}.${NEX_T1_ENS_PARENT}`;
}

export function buildDefaultReverseMessageHash({
  address,
  expiry,
  name,
}: ReverseMessageHashInput): Hex {
  return hashMessage({
    raw: keccak256(
      encodePacked(
        ["address", "bytes4", "address", "uint256", "string"],
        [
          DEFAULT_REVERSE_REGISTRAR_ADDRESS,
          DEFAULT_REVERSE_SELECTOR,
          getAddress(address),
          expiry,
          name,
        ],
      ),
    ),
  });
}

export function buildBaseReverseMessageHash({
  address,
  expiry,
  name,
  coinTypes = [BigInt(toCoinType(base.id))],
}: BaseReverseMessageHashInput): Hex {
  return hashMessage({
    raw: keccak256(
      encodePacked(
        ["address", "bytes4", "address", "uint256", "string", "uint256[]"],
        [
          BASE_L2_REVERSE_REGISTRAR_ADDRESS,
          BASE_REVERSE_SELECTOR,
          getAddress(address),
          expiry,
          name,
          [...coinTypes],
        ],
      ),
    ),
  });
}
