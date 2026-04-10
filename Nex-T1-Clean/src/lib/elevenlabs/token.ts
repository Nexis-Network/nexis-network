"use client";

type TokenRequest = {
  agentId?: string | null;
  voiceId?: string | null;
};

export async function fetchConversationToken({ agentId, voiceId }: TokenRequest) {
  const res = await fetch("/api/support/elevenlabs/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ agentId, voiceId }),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(`Conversation token request failed: ${res.status} ${message}`);
  }

  const payload = (await res.json().catch(() => ({}))) as { token?: string | null };
  return payload?.token ?? null;
}

