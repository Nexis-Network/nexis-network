export type ConversationSource = {
  id?: string;
  title: string;
  url: string;
  snippet?: string;
};

const INLINE_CITATION_REGEX =
  /\bcite(?:\s*(?::|#)\s*([A-Za-z0-9._:/,-]+)|\s*\(\s*([^)]+)\s*\)|\s*\[\s*([^\]]+)\s*\]|\s*\{\s*([^}]+)\s*\})?/gi;

export type InlineCitationSegment =
  | { type: "text"; value: string }
  | { type: "citation"; sources: ConversationSource[] };

export const parseCitationIds = (rawIds: string): string[] => {
  if (!rawIds.trim()) return [];
  return rawIds
    .split(/[,\s|]+/)
    .map((id) => id.trim())
    .filter(Boolean);
};

export const resolveCitationSources = (
  ids: string[],
  sources: ConversationSource[],
): ConversationSource[] => {
  if (!ids.length) return sources.slice(0, 1);

  const resolved: ConversationSource[] = [];

  ids.forEach((id) => {
    const match =
      sources.find((source) => source.id === id) ??
      sources.find((source) => (source.url ?? "").includes(id)) ??
      sources[Number(id)] ??
      null;

    if (match) {
      resolved.push(match);
    } else {
      resolved.push({
        id,
        title: id,
        url: id,
        snippet: "Referenced source",
      });
    }
  });

  return resolved;
};

export const parseTextWithInlineCitations = (
  text: string,
  sources: ConversationSource[],
): InlineCitationSegment[] => {
  const normalized = text.replace(/\r\n/g, "\n");

  const segments: InlineCitationSegment[] = [];
  let lastIndex = 0;
  let regexResult: RegExpExecArray | null;

  while ((regexResult = INLINE_CITATION_REGEX.exec(normalized)) !== null) {
    const textChunk = normalized.slice(lastIndex, regexResult.index);
    if (textChunk.length > 0) {
      segments.push({ type: "text", value: textChunk });
    }

    const idPart =
      regexResult[1] ??
      regexResult[2] ??
      regexResult[3] ??
      regexResult[4] ??
      "";
    const citedIds = parseCitationIds(idPart);
    const resolvedSources = resolveCitationSources(citedIds, sources);

    if (resolvedSources.length > 0) {
      segments.push({ type: "citation", sources: resolvedSources });
    }

    lastIndex = regexResult.index + regexResult[0].length;
  }

  const tail = normalized.slice(lastIndex);
  if (tail.length > 0) {
    segments.push({ type: "text", value: tail });
  }

  return segments;
};
