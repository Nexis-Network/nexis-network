export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonObject
  | JsonArray;

export type JsonObject = {
  [key: string]: JsonValue | undefined;
};

export type JsonArray = JsonValue[];

export type JsonRecord = JsonObject;
