type TranslationPrimitive = string | number | boolean | null | undefined;
export type TranslationValues = Record<string, TranslationPrimitive>;
export type TranslationTree = {
  [key: string]: string | TranslationTree;
};

function getPathValue(tree: TranslationTree, path: string): string | TranslationTree | undefined {
  return path.split(".").reduce<string | TranslationTree | undefined>((acc, segment) => {
    if (!acc || typeof acc === "string") return undefined;
    return acc[segment];
  }, tree);
}

export function translate(
  tree: TranslationTree,
  key: string,
  values?: TranslationValues,
) {
  const value = getPathValue(tree, key);
  if (typeof value !== "string") {
    return key;
  }

  if (!values) return value;

  return value.replace(/\{(\w+)\}/g, (_, token) => {
    const replacement = values[token];
    return replacement === null || replacement === undefined ? "" : String(replacement);
  });
}

