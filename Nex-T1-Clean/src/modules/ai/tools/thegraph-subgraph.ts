
/**
 * TheGraph Subgraph Tool
 *
 * Domain: AI Tools - Data Querying
 * Responsibility: Query TheGraph subgraphs and fetch schemas using the Gateway API.
 * Replicates functionality of the official Subgraph MCP server.
 */

import { createTool, createToolSchema, stringProp, booleanProp } from "./create-tool";

const THEGRAPH_API_KEY = process.env.THEGRAPH_API_KEY;

// ============================================================================
// HELPERS
// ============================================================================

const getGatewayUrl = (subgraphId: string) => {
  if (!THEGRAPH_API_KEY) {
    throw new Error("THEGRAPH_API_KEY is not configured");
  }
  return `https://gateway.thegraph.com/api/${THEGRAPH_API_KEY}/subgraphs/id/${subgraphId}`;
};

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      types {
        name
        kind
        description
        fields {
          name
          description
          args {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
`;

/**
 * Basic JSON to SDL converter for introspection results.
 * Handles primary Object types to give a readable schema representation.
 */
const jsonToSDL = (schemaData: UntypedJson): string => {
  if (!schemaData?.__schema?.types) return "Invalid schema data";
  
  const types = schemaData.__schema.types;
  let sdl = "";

  for (const type of types) {
    // Skip internal types and scalers usually implied
    if (type.name.startsWith("__") || type.kind === "SCALAR") continue;

    if (type.description) {
      sdl += `"""\n${type.description}\n"""\n`;
    }

    if (type.kind === "OBJECT" || type.kind === "INTERFACE") {
      sdl += `${type.kind.toLowerCase()} ${type.name} {\n`;
      
      if (type.fields) {
        for (const field of type.fields) {
            // Field description
            if (field.description) {
                sdl += `  "${field.description}"\n`;
            }
            
            // Field definition: name(args): Type
            let fieldDef = `  ${field.name}`;
            
            // Args
            if (field.args && field.args.length > 0) {
                const argsDef = field.args.map((arg: UntypedJson) => {
                    return `${arg.name}: ${getTypeName(arg.type)}`;
                }).join(", ");
                fieldDef += `(${argsDef})`;
            }
            
            // Return type
            fieldDef += `: ${getTypeName(field.type)}\n`;
            sdl += fieldDef;
        }
      }
      sdl += "}\n\n";
    } else if (type.kind === "ENUM") {
        sdl += `enum ${type.name} {\n`;
        if (type.enumValues) {
            for (const val of type.enumValues) {
                sdl += `  ${val.name}\n`;
            }
        }
        sdl += "}\n\n";
    }
  }
  
  return sdl.trim();
};

const getTypeName = (type: UntypedJson): string => {
    if (!type) return "Unknown";
    if (type.kind === "NON_NULL") {
        return `${getTypeName(type.ofType)}!`;
    }
    if (type.kind === "LIST") {
        return `[${getTypeName(type.ofType)}]`;
    }
    return type.name || "Unknown";
};

// ============================================================================
// TOOLS
// ============================================================================

export const getSubgraphSchemaTool = createTool<
  { subgraphId: string; asText?: boolean },
  { schema: UntypedJson; format: "json" | "text" }
>({
  description: "Fetches the schema of a specified subgraph (TheGraph).",
  schema: createToolSchema({
    subgraphId: stringProp("The subgraph ID (e.g., QmZBQcF...)"),
    asText: booleanProp("Return human-readable GraphQL SDL format? (default: false)", false),
  }),
  execute: async ({ subgraphId, asText }) => {
    const url = getGatewayUrl(subgraphId);
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: INTROSPECTION_QUERY }),
    });

    if (!response.ok) {
      throw new Error(`TheGraph API Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(`GraphQL Error: ${JSON.stringify(data.errors)}`);
    }

    if (asText) {
        return {
            schema: jsonToSDL(data.data),
            format: "text"
        };
    }

    return { 
      schema: data.data, 
      format: "json" 
    };
  },
});

export const querySubgraphTool = createTool<
  { subgraphId: string; query: string },
  { data: UntypedJson }
>({
  description: "Executes GraphQL queries against a specified subgraph (TheGraph).",
  schema: createToolSchema({
    subgraphId: stringProp("The subgraph ID (e.g., QmZBQcF...)"),
    query: stringProp("GraphQL query string"),
  }),
  execute: async ({ subgraphId, query }) => {
    const url = getGatewayUrl(subgraphId);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`TheGraph API Error: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      return { data: { errors: result.errors } };
    }

    return { data: result.data };
  },
});
