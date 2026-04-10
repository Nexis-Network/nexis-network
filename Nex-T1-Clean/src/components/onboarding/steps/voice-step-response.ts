import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";

const isRecord = (value: UntypedJson): value is Record<string, UntypedJson> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isVoice = (value: UntypedJson): value is ElevenLabs.Voice => {
  if (!isRecord(value)) return false;

  return (
    typeof value.voiceId === "string" &&
    value.voiceId.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0
  );
};

const readVoices = (value: UntypedJson): UntypedJson[] => {
  if (!isRecord(value)) return [];
  return Array.isArray(value.voices) ? value.voices : [];
};

export function extractVoicesFromPayload(payload: UntypedJson): ElevenLabs.Voice[] {
  const directVoices = readVoices(payload).filter(isVoice);
  if (directVoices.length > 0) {
    return directVoices;
  }

  const wrappedVoices = isRecord(payload) ? readVoices(payload.data) : [];
  return wrappedVoices.filter(isVoice);
}

export function extractApiErrorMessage(payload: UntypedJson): string | null {
  if (!isRecord(payload)) return null;
  if (!isRecord(payload.error)) return null;

  const { message } = payload.error;
  return typeof message === "string" && message.trim().length > 0 ? message : null;
}
