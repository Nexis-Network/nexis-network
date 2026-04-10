import { createHash } from "crypto";

export type AttestationArtifact = Record<string, UntypedJson>;

export type AttestationPolicy = {
  provider: string; // e.g., 'phala'
  version: string;  // policy version
  measurements: string[]; // pinned measurement hashes
};

function stableStringify(value: UntypedJson): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const record = value as Record<string, UntypedJson>;
  const entries = Object.entries(record)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

export function computeAttestationHash(artifact: AttestationArtifact): string {
  const json = stableStringify(artifact);
  return createHash("sha256").update(json).digest("hex");
}

export function verifyAttestation(
  artifact: AttestationArtifact,
  policy: AttestationPolicy
): { ok: true; hash: string } | { ok: false; hash: string; reason: string } {
  try {
    // The artifact's `measurement` field is the static TDX code digest (deterministic).
    // The full artifact also includes `timestamp` which changes per call, so we must
    // compare the measurement field directly rather than hashing the entire artifact.
    const artifactMeasurement = typeof artifact.measurement === "string" ? artifact.measurement : "";
    // Also compute a hash of the full artifact for audit/logging purposes.
    const hash = artifactMeasurement || computeAttestationHash(artifact);
    if (!policy.measurements || policy.measurements.length === 0) {
      return { ok: false, hash, reason: "policy has no pinned measurements" };
    }
    const ok = policy.measurements.includes(hash);
    return ok ? { ok: true, hash } : { ok: false, hash, reason: "measurement not in policy" };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return { ok: false, hash: "", reason };
  }
}
