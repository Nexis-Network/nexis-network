import { ElevenLabsClient, type ElevenLabs } from "@elevenlabs/elevenlabs-js";


import { logger } from '@/lib/logger';
export const ALLOWED_VOICE_NAMES = [
  "Mark - ConvoAI",
  "Roger",
  "Brian",
  "Eric",
  "Laura",
  "Wesley Bessa",
  "Otto",
  "Putra",
  "Nikolay",
  "Alberto",
] as const;

const allowedNameSet = new Set(ALLOWED_VOICE_NAMES.map((name) => name.toLowerCase()));

export type VoiceSummary = Pick<ElevenLabs.Voice, "voiceId" | "name" | "previewUrl" | "labels">;

const sanitizeVoice = (voice: ElevenLabs.Voice): VoiceSummary => ({
  voiceId: voice.voiceId ?? "",
  name: voice.name ?? "Untitled Voice",
  previewUrl: voice.previewUrl,
  labels: voice.labels,
});

export async function fetchAllowedVoices(): Promise<VoiceSummary[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    logger.error("[elevenlabs] Missing ELEVENLABS_API_KEY env var");
    return [];
  }

  const client = new ElevenLabsClient({ apiKey });

  try {
    const response = await client.voices.getAll();
    const voices = Array.isArray(response.voices) ? response.voices : [];
    
    logger.debug(`[elevenlabs] Fetched ${voices.length} voices from API`);

    const filtered = voices.filter((voice) =>
      voice?.name ? allowedNameSet.has(voice.name.toLowerCase()) : false,
    );

    const ordered = ALLOWED_VOICE_NAMES
      .map((name) => filtered.find((voice) => voice.name?.toLowerCase() === name.toLowerCase()))
      .filter((voice): voice is ElevenLabs.Voice => Boolean(voice && voice.voiceId));

    const selected = ordered.length > 0 ? ordered : voices.slice(0, 10);
    
    if (selected.length === 0) {
        logger.warn("[elevenlabs] No voices selected after filtering/fallback.");
    }

    return selected
      .map(sanitizeVoice)
      .filter((voice) => Boolean(voice.voiceId && voice.name));
  } catch (error) {
    logger.error("[elevenlabs] Error fetching voices", error);
    return [];
  }
}
