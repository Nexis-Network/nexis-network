import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaimRecordMock = vi.hoisted(() => vi.fn());
const getCurrentProfileLabelMock = vi.hoisted(() => vi.fn());
const isLabelReservedByAnotherUserMock = vi.hoisted(() => vi.fn());
const lookupEnsSubnameByAddressMock = vi.hoisted(() => vi.fn());
const updateClaimRecordMock = vi.hoisted(() => vi.fn());
const upsertClaimRecordMock = vi.hoisted(() => vi.fn());
const enqueueEnsSubnameClaimMock = vi.hoisted(() => vi.fn());
const ensureSmartWalletAddressMock = vi.hoisted(() => vi.fn());
const getEnsSubnameRuntimeReadinessMock = vi.hoisted(() => vi.fn());
const assertEnsSubnameRuntimeReadyMock = vi.hoisted(() => vi.fn());

vi.mock("./subnames.repository", () => ({
  getClaimRecord: getClaimRecordMock,
  getCurrentProfileLabel: getCurrentProfileLabelMock,
  isLabelReservedByAnotherUser: isLabelReservedByAnotherUserMock,
  lookupEnsSubnameByAddress: lookupEnsSubnameByAddressMock,
  updateClaimRecord: updateClaimRecordMock,
  upsertClaimRecord: upsertClaimRecordMock,
}));

vi.mock("./subnames.worker", () => ({
  enqueueEnsSubnameClaim: enqueueEnsSubnameClaimMock,
}));

vi.mock("./subnames.wallets", () => ({
  ensureSmartWalletAddress: ensureSmartWalletAddressMock,
}));

vi.mock("./subnames.runtime", () => ({
  ENS_SUBNAME_RUNTIME_UNAVAILABLE_MESSAGE:
    "ENS subname claims are temporarily unavailable. Please try again later.",
  getEnsSubnameRuntimeReadiness: getEnsSubnameRuntimeReadinessMock,
  assertEnsSubnameRuntimeReady: assertEnsSubnameRuntimeReadyMock,
}));

import { getEnsSubnameStatus } from "./subnames.service";

describe("getEnsSubnameStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEnsSubnameRuntimeReadinessMock.mockReturnValue({
      ready: false,
      message: "ENS subname claims are temporarily unavailable. Please try again later.",
      missingEnvNames: ["ENS_SUBNAME_REGISTRAR_ADDRESS"],
    });
    getCurrentProfileLabelMock.mockResolvedValue("ensdemo");
    ensureSmartWalletAddressMock.mockResolvedValue(
      "0x5D4B83Fe975A973A3731E0FD8606DF7B5872e8D2",
    );
  });

  it("degrades gracefully when the ENS claim table is missing", async () => {
    getClaimRecordMock.mockRejectedValueOnce(
      new Error(
        "Could not find the table 'public.user_ens_subnames' in the schema cache",
      ),
    );

    const status = await getEnsSubnameStatus("user-1", "user@example.com");

    expect(status).toEqual({
      claim: null,
      walletAddress: "0x5D4B83Fe975A973A3731E0FD8606DF7B5872e8D2",
      canClaim: false,
      claimAvailabilityError:
        "ENS subname claims are temporarily unavailable. Please try again later.",
      suggestedLabel: "ensdemo",
      validationError: null,
    });
  });
});
