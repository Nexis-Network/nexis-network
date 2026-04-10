import { CryptorankClient, type CryptorankClientOptions, type CryptorankResponse } from "./client";
import { parseCryptorankInvocation, type CryptorankParamsByEndpoint } from "./schema";
import { getEndpointDefinition, type CryptorankEndpointId } from "./metadata";

export type CryptorankInvokeInput<K extends CryptorankEndpointId> = {
  endpoint: K;
  params?: Record<string, UntypedJson>;
};

export type CryptorankInvokeOptions = {
  client?: CryptorankClient;
};

export type CryptorankInvokeResult<K extends CryptorankEndpointId> = {
  endpoint: K;
  params: CryptorankParamsByEndpoint[K];
  definition: Awaited<ReturnType<typeof getEndpointDefinition>>;
  response: CryptorankResponse;
  requestedAt: string;
};

const defaultClient = (() => {
  try {
    return new CryptorankClient();
  } catch {
    return null;
  }
})();

export const createCryptorankClient = (options?: CryptorankClientOptions) => new CryptorankClient(options);

const buildRequestPath = <K extends CryptorankEndpointId>(
  definition: Awaited<ReturnType<typeof getEndpointDefinition>>,
  params: CryptorankParamsByEndpoint[K],
) => {
  const pathParamNames = new Set(definition.pathParams.map((param) => param.name));
  let resolvedPath = definition.path;
  for (const param of definition.pathParams) {
    const value = params[param.name];
    if (typeof value === "undefined") {
      throw new Error(`Missing required path parameter "${param.name}" for endpoint ${definition.id}`);
    }
    resolvedPath = resolvedPath.replace(
      new RegExp(`{${param.name}}`, "g"),
      encodeURIComponent(String(value)),
    );
  }

  const query: Record<string, UntypedJson> = {};
  for (const [key, value] of Object.entries(params)) {
    if (pathParamNames.has(key)) {
      continue;
    }
    if (typeof value === "undefined") {
      continue;
    }
    query[key] = value;
  }

  return { path: resolvedPath, query };
};

export async function invokeCryptorankEndpoint<K extends CryptorankEndpointId>(
  input: CryptorankInvokeInput<K>,
  options: CryptorankInvokeOptions = {},
): Promise<CryptorankInvokeResult<K>> {
  const parsed = await parseCryptorankInvocation(input);
  const params = parsed.params as CryptorankParamsByEndpoint[K];
  const definition = await getEndpointDefinition(parsed.endpoint);
  const client = options.client ?? defaultClient ?? new CryptorankClient();
  const { path, query } = buildRequestPath(definition, params);
  const response = await client.request({ path, query });

  return {
    endpoint: parsed.endpoint as K,
    params,
    definition,
    response,
    requestedAt: new Date().toISOString(),
  } satisfies CryptorankInvokeResult<K>;
}

export type { CryptorankEndpointId } from "./metadata";
