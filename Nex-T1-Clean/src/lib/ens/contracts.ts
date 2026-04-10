import { parseAbi } from "viem";

export const ENS_SUBNAME_REGISTRAR_ABI = parseAbi([
  "function claim(address owner, string label) returns (bytes32 node)",
]);

export const BASE_L2_REVERSE_REGISTRAR_ADDRESS =
  "0x0000000000D8e504002cC26E3Ec46D81971C1664" as const;

export const BASE_L2_REVERSE_REGISTRAR_ABI = parseAbi([
  "function setName(string name)",
  "function nameForAddr(address addr) view returns (string name)",
]);

