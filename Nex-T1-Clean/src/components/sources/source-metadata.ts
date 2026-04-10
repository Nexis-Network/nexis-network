import { getSourceIconDefinition } from "@/components/sources/source-icon-map";

export type SourceMetadataInput = {
  title?: string | null;
  url?: string | null;
  snippet?: string | null;
};

const normalizeText = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

export const getSourceHostname = (url: string | null | undefined): string => {
  const normalized = normalizeText(url);
  if (!normalized) {
    return "";
  }

  try {
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return normalized
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      ?.toLowerCase() ?? "";
  }
};

export const getSourceFaviconUrl = (
  url: string | null | undefined,
): string | null => {
  const hostname = getSourceHostname(url);
  if (!hostname) {
    return null;
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
};

export const getSourceDisplayName = (
  input: Pick<SourceMetadataInput, "title" | "url">,
): string => {
  const mapped = getSourceIconDefinition(input);
  if (mapped) {
    return mapped.label;
  }

  const hostname = getSourceHostname(input.url);
  if (hostname) {
    return hostname;
  }

  const title = normalizeText(input.title);
  return title || "Source";
};

export const getSourceTitle = (
  input: Pick<SourceMetadataInput, "title" | "url">,
): string => {
  const title = normalizeText(input.title);
  return title || getSourceDisplayName(input);
};

const collapseSentenceWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const getSourceDescription = (input: SourceMetadataInput): string => {
  const snippet = collapseSentenceWhitespace(normalizeText(input.snippet));
  if (snippet) {
    const sentenceMatch = snippet.match(/^(.+?[.!?])(\s|$)/);
    return sentenceMatch?.[1] ?? snippet;
  }

  return `Referenced source from ${getSourceDisplayName(input)}.`;
};
