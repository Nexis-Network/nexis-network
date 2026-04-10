import "server-only";

import { memecoinAutotradeParamsSchema } from "@/server/market/solana/memecoin-scoring";

// Stored in `automation_strategies.parameters` as a single flat object.
export const solanaMemecoinStrategyParametersSchema = memecoinAutotradeParamsSchema;

export type SolanaMemecoinStrategyParameters = import("zod").infer<typeof solanaMemecoinStrategyParametersSchema>;
