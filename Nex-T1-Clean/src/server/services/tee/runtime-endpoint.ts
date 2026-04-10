import { verifyAttestation, type AttestationArtifact, type AttestationPolicy } from '@/server/services/tee/attestation-policy';

type AttestationResult =
  | { ok: true; hash: string; artifact: AttestationArtifact }
  | { ok: false; hash: string; reason: string; artifact: AttestationArtifact };

export async function attestRuntimeEndpoint(baseUrl: string, policy: AttestationPolicy): Promise<AttestationResult> {
  let attestUrl: string;
  try {
    attestUrl = new URL('/attest', baseUrl).toString();
  } catch {
    throw new Error('runtime_attestation_invalid_url');
  }

  const res = await fetch(attestUrl, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`runtime_attestation_failed:${res.status}`);
  }

  const artifact = (await res.json()) as AttestationArtifact;
  const result = verifyAttestation(artifact, policy);
  return { ...(result), artifact } as AttestationResult;
}
