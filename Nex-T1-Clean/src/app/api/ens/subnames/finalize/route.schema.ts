import { z } from "zod";

export const SubmitEnsClaimSchema = z.object({
  claimId: z.string().uuid(),
  mainnetReverseSignature: z.string().trim().regex(/^0x[0-9a-fA-F]+$/),
  baseReverseSignature: z.string().trim().regex(/^0x[0-9a-fA-F]+$/),
});
