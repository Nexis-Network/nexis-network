export type SettingsSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function resolveSettingsSearchParams(
  searchParams?: SettingsSearchParams,
): Promise<Record<string, string | string[] | undefined>> {
  return (searchParams ? await searchParams : {}) ?? {};
}

export function pickFirstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}
