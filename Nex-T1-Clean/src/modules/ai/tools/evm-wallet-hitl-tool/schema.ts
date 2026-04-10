import {
    createToolSchema,
    stringProp,
    arrayProp,
    objectProp,
    enumProp,
} from "../create-tool";
import type { JSONSchema7 } from "json-schema";
import { EVM_TOOL_NAMES } from "./types";

const jsonPrimitiveSchema: JSONSchema7 = {
    oneOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        { type: "null" },
    ],
};

const argEntrySchema: JSONSchema7 = objectProp("Argument entry", {
    key: stringProp("Argument name"),
    value: {
        description: "Argument value",
        oneOf: [
            jsonPrimitiveSchema,
            { type: "array", items: jsonPrimitiveSchema },
            {
                type: "array",
                items: objectProp("Key-value pair", {
                    key: stringProp("Property name"),
                    value: jsonPrimitiveSchema,
                }),
                description: "Nested object as key-value pairs",
            },
        ],
    } as JSONSchema7,
});

export const evmWalletHitlSchema = createToolSchema(
    {
        command: enumProp("EVM wallet command to execute", EVM_TOOL_NAMES),
        args: arrayProp("Arguments as key-value pairs", argEntrySchema),
        providerURL: stringProp("Optional provider URL override"),
        userId: stringProp("User ID (injected by context)"),
    },
    ["command"]
);
