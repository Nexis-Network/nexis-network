import { base } from "viem/chains";
import { encodePacked, hashMessage, keccak256, toCoinType } from "viem";

import {
  BASE_L2_REVERSE_REGISTRAR_ADDRESS,
  DEFAULT_REVERSE_REGISTRAR_ADDRESS,
  buildBaseReverseMessageHash,
  buildDefaultReverseMessageHash,
  buildEnsFullName,
  validateEnsSubnameLabel,
} from "./claim-helpers";

describe("validateEnsSubnameLabel", () => {
  it("accepts lowercase labels within the supported character set", () => {
    expect(validateEnsSubnameLabel("alice-123").success).toBe(true);
  });

  it("rejects uppercase, punctuation, and leading hyphens", () => {
    expect(validateEnsSubnameLabel("Alice").success).toBe(false);
    expect(validateEnsSubnameLabel("al!ce").success).toBe(false);
    expect(validateEnsSubnameLabel("-alice").success).toBe(false);
  });
});

describe("buildEnsFullName", () => {
  it("appends the nex-t1.eth parent", () => {
    expect(buildEnsFullName("alice")).toBe("alice.nex-t1.eth");
  });
});

describe("reverse message hashes", () => {
  const address = "0x1111111111111111111111111111111111111111";
  const expiry = 1_900_000_000n;
  const name = "alice.nex-t1.eth";

  it("builds the default reverse registrar hash from the ENS contract formula", () => {
    const expected = hashMessage({
      raw: keccak256(
        encodePacked(
          ["address", "bytes4", "address", "uint256", "string"],
          [
            DEFAULT_REVERSE_REGISTRAR_ADDRESS,
            "0x012a67bc",
            address,
            expiry,
            name,
          ],
        ),
      ),
    });

    expect(buildDefaultReverseMessageHash({ address, expiry, name })).toBe(expected);
  });

  it("builds the Base L2 reverse registrar hash with the required coinType list", () => {
    const baseCoinType = BigInt(toCoinType(base.id));
    const expected = hashMessage({
      raw: keccak256(
        encodePacked(
          ["address", "bytes4", "address", "uint256", "string", "uint256[]"],
          [
            BASE_L2_REVERSE_REGISTRAR_ADDRESS,
            "0x2023a04c",
            address,
            expiry,
            name,
            [baseCoinType],
          ],
        ),
      ),
    });

    const actual = buildBaseReverseMessageHash({
      address,
      expiry,
      name,
      coinTypes: [baseCoinType],
    });

    expect(actual).toBe(expected);
  });
});
