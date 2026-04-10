import "server-only";

export type RuntimeCostConfig = {
  runtimeKind: "e2b";
  usdPerMinute: number;
  minimumMinutes: number;
};

const RUNTIME_COSTS: Record<RuntimeCostConfig["runtimeKind"], RuntimeCostConfig> =
  {
    e2b: {
      runtimeKind: "e2b",
      usdPerMinute: 0.0017,
      minimumMinutes: 3,
    },
  };

export function getRuntimeCostConfig(
  runtimeKind: RuntimeCostConfig["runtimeKind"],
): RuntimeCostConfig {
  return RUNTIME_COSTS[runtimeKind];
}
