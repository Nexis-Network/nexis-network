// Domain: notifications
// Responsibility: Send Expo push notifications for mobile devices.
// Depends on: native fetch + Expo push API

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 100;

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
};

function chunkMessages(messages: ExpoPushMessage[]): ExpoPushMessage[][] {
  const chunks: ExpoPushMessage[][] = [];

  for (let index = 0; index < messages.length; index += EXPO_PUSH_CHUNK_SIZE) {
    chunks.push(messages.slice(index, index + EXPO_PUSH_CHUNK_SIZE));
  }

  return chunks;
}

function buildHeaders(accessToken?: string | null): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export function isExpoPushToken(token: string): boolean {
  return (
    /^ExponentPushToken\[[^\]]+\]$/.test(token) ||
    /^ExpoPushToken\[[^\]]+\]$/.test(token)
  );
}

export async function sendExpoPushMessages(
  messages: ExpoPushMessage[],
  options: {
    accessToken?: string | null;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<unknown[]> {
  if (messages.length === 0) {
    return [];
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const tickets: unknown[] = [];

  for (const batch of chunkMessages(messages)) {
    const response = await fetchImpl(EXPO_PUSH_URL, {
      method: "POST",
      headers: buildHeaders(options.accessToken),
      body: JSON.stringify(batch),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: unknown[]; errors?: Array<{ message?: string }> }
      | null;

    if (!response.ok) {
      const message =
        payload?.errors
          ?.map((error) => error?.message)
          .filter((value): value is string => Boolean(value))
          .join("; ") ||
        `Expo push request failed with status ${response.status}`;
      throw new Error(message);
    }

    if (Array.isArray(payload?.data)) {
      tickets.push(...payload.data);
    }
  }

  return tickets;
}
