import {
  getCryptorankEndpoints,
  type CryptorankEndpointDefinition,
  type CryptorankEndpointId,
} from "./metadata";

export type CryptorankInvocationInput = {
  endpoint: CryptorankEndpointId;
  params: Record<string, UntypedJson>;
};

export type CryptorankParamsByEndpoint = {
  [K in CryptorankEndpointId]: Record<string, UntypedJson>;
};

const assertRecord = (value: UntypedJson): Record<string, UntypedJson> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, UntypedJson>;
};

const ensureRequiredParameters = (
  definition: CryptorankEndpointDefinition,
  params: Record<string, UntypedJson>,
) => {
  for (const param of definition.pathParams) {
    if (typeof params[param.name] === "undefined") {
      throw new Error(`Missing required path parameter "${param.name}".`);
    }
  }

  for (const param of definition.query) {
    if (!param.required) continue;
    if (typeof params[param.name] === "undefined") {
      throw new Error(`Missing required query parameter "${param.name}".`);
    }
  }
};

export const parseCryptorankInvocation = async (raw: {
  endpoint: UntypedJson;
  params?: UntypedJson;
}): Promise<CryptorankInvocationInput> => {
  if (typeof raw?.endpoint !== "string") {
    throw new Error("Cryptorank tool requires an endpoint string.");
  }

  const endpoints = await getCryptorankEndpoints();

  if (!(raw.endpoint in endpoints)) {
    throw new Error(`Unknown CryptoRank endpoint "${raw.endpoint}".`);
  }

  const endpoint = raw.endpoint as CryptorankEndpointId;
  const definition = endpoints[endpoint];
  const params = assertRecord(raw.params);

  ensureRequiredParameters(definition, params);

  return {
    endpoint,
    params,
  };
};
