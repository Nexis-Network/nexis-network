import type { Source } from "@/lib/schema";
import { coerceNonEmptyString, isRecord } from "./guards";
import type { CompatMessageAccumulator } from "./compat-state";
import type { MessagePart } from "./types";

function pushSource(
  accumulator: CompatMessageAccumulator,
  source: Source,
): void {
  accumulator.sources.push(source);
}

export function processContentPart(
  part: MessagePart,
  accumulator: CompatMessageAccumulator,
): boolean {
  switch (part.type) {
    case "text": {
      const text = part.text ?? part.content ?? "";
      if (typeof text === "string" && text.length > 0) {
        accumulator.fullTextParts.push(text);
      }
      return true;
    }
    case "text-delta": {
      const delta = part.text ?? part.textDelta ?? part.delta;
      if (typeof delta === "string" && delta.length > 0) {
        accumulator.deltaTextParts.push(delta);
      }
      return true;
    }
    case "reasoning": {
      if (typeof part.text === "string" && part.text.length > 0) {
        accumulator.thoughts.push({ thought: part.text, ideaFragment: "" });
      }
      return true;
    }
    case "data-reasoning": {
      const delta = part.data?.delta;
      if (typeof delta === "string" && delta.length > 0) {
        accumulator.thoughts.push({ thought: delta, ideaFragment: "" });
      }
      return true;
    }
    case "source-url": {
      pushSource(accumulator, {
        id:
          coerceNonEmptyString(part.sourceId) ??
          coerceNonEmptyString(part.id) ??
          accumulator.createSyntheticId("source"),
        title: coerceNonEmptyString(part.title) ?? coerceNonEmptyString(part.url) ?? "Source",
        url: coerceNonEmptyString(part.url) ?? "",
      });
      return true;
    }
    case "source-document": {
      pushSource(accumulator, {
        id:
          coerceNonEmptyString(part.sourceId) ??
          coerceNonEmptyString(part.id) ??
          accumulator.createSyntheticId("source"),
        title:
          coerceNonEmptyString(part.title) ??
          coerceNonEmptyString(part.filename) ??
          "Document",
        url: "",
      });
      return true;
    }
    case "data-source": {
      if (!isRecord(part.data)) {
        return true;
      }

      pushSource(accumulator, {
        id:
          coerceNonEmptyString(part.data.sourceId) ??
          coerceNonEmptyString(part.id) ??
          accumulator.createSyntheticId("source"),
        title:
          coerceNonEmptyString(part.data.title) ??
          coerceNonEmptyString(part.data.url) ??
          coerceNonEmptyString(part.data.filename) ??
          "Source",
        url: coerceNonEmptyString(part.data.url) ?? "",
        ...(coerceNonEmptyString(part.data.snippet)
          ? { snippet: coerceNonEmptyString(part.data.snippet) ?? undefined }
          : {}),
      });
      return true;
    }
    case "error": {
      const errorText = part.errorText ?? part.text;
      if (typeof errorText === "string" && errorText.length > 0) {
        accumulator.deltaTextParts.push(errorText);
      }
      return true;
    }
    default:
      return false;
  }
}
