export const MAX_ATTACHMENT_CONTEXT_CHARS = 6000;
const TRUNCATION_NOTICE = "[Attachment context truncated]";

/**
 * Combine attachment prompt segments into a bounded block of text.
 * Returns both the text and whether truncation occurred so callers can log/telemetry.
 */
export function combineAttachmentContexts(
  segments: string[],
  limit: number = MAX_ATTACHMENT_CONTEXT_CHARS,
): { text: string; truncated: boolean } {
  if (limit <= 0) {
    return { text: "", truncated: segments.some((segment) => Boolean(segment?.trim())) };
  }

  const output: string[] = [];
  let remaining = limit;
  let truncated = false;

  for (const rawSegment of segments) {
    const segment = rawSegment?.trim();
    if (!segment) continue;

    // Include spacing cost when joining segments.
    const separatorCost = output.length > 0 ? 2 : 0; // accounts for "\n\n"
    const totalCost = segment.length + separatorCost;

    if (totalCost <= remaining) {
      output.push(segment);
      remaining -= totalCost;
      continue;
    }

    if (remaining > separatorCost) {
      const available = remaining - separatorCost;
      const slice = segment.slice(0, Math.max(0, available));
      if (slice) {
        output.push(`${slice}…`);
      }
    }

    truncated = true;
    break;
  }

  if (truncated) {
    output.push(TRUNCATION_NOTICE);
  }

  return {
    text: output.join("\n\n").trim(),
    truncated,
  };
}

/**
 * Estimate the payload size of a base64 data URL (in kilobytes). Returns null if not base64.
 */
export function estimateDataUrlSizeInKb(url: string | undefined): number | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const match = url.match(/^data:[^;]+;base64,(.+)$/i);
  if (!match) {
    return null;
  }

  const base64Length = match[1]?.length ?? 0;
  if (base64Length === 0) {
    return 0;
  }

  const sizeBytes = Math.floor((base64Length * 3) / 4);
  return Math.max(1, Math.round(sizeBytes / 1024));
}
