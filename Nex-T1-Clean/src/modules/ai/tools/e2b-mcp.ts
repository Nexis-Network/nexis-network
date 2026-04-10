
/**
 * E2B MCP Tools
 * 
 * Provides tools to install, start, and interact with MCP servers running inside the E2B sandbox.
 * Uses an "SSE Bridge" pattern to expose CLI-based MCP servers (stdio) over HTTP/SSE.
 */

import { Sandbox } from "@e2b/code-interpreter";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { JSONSchema7 } from "json-schema";
import {
  createTool,
  createToolSchema,
  stringProp,
  // booleanProp,
} from "./create-tool";
import { logger } from "@/lib/logger";
import { buildSandboxMcpUrl } from "@/types/e2b-sandbox";

// The Bridge Script (To be written to the sandbox)
// This script uses standard node libs + express to bridge SSE -> Stdio
// We need to ensure 'express' and '@modelcontextprotocol/sdk' are installed in the sandbox first.
const BRIDGE_SCRIPT_CONTENT = `
import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'; // Wait, we need to spawn the process
import { spawn } from 'child_process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Actually, we are wrapping an EXISTING stdio server, not creating one.
// We need a "Proxy" that listens on SSE and pipes to a child process.
// The SDK doesn't have a pre-built "StdioToSseProxy". We have to build a simple one.

// SIMPLIFIED APPROACH:
// We will use the official SDK classes effectively.
// But mostly we just need:
// 1. GET /sse -> Start SSE stream.
// 2. Receive JSON-RPC messages via POST /messages.
// 3. Forward them to the Child Process STDIN.
// 4. Listen to Child Process STDOUT, parse JSON-RPC, send back via SSE events.

const app = express();
const PORT = 50005;

// The command to run (passed as args)
const command = process.argv[2];
const args = process.argv.slice(3);

console.error(\`Starting MCP Bridge for: \${command} \${args.join(' ')}\`);

const child = spawn(command, args, {
  stdio: ['pipe', 'pipe', 'inherit'] // pipe stdin/out, inherit stderr for logs
});

app.use(express.json());

let sseResponse = null;

// SSE Endpoint
app.get('/mcp', (req, res) => {
  console.error('New SSE Connection');
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  sseResponse = res;
  
  // Send "endpoint" event to tell client where to post messages
  // The client usually expects the SSE URL itself or a separate POST URL.
  // Standard MCP SSE: server sends 'endpoint' event with the POST URL.
  res.write(\`event: endpoint\\ndata: /message\\n\\n\`);
});

// Message Endpoint
app.post('/message', (req, res) => {
  const message = req.body;
  // logger.error('Received message:', JSON.stringify(message));
  
  // Forward to child process
  const json = JSON.stringify(message);
  child.stdin.write(json + '\\n');
  
  res.send('ok');
});

// Listen to Child Output
let buffer = '';
child.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  
  const lines = buffer.split('\\n');
  buffer = lines.pop(); // Keep incomplete line
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
        // Verify it is JSON
        JSON.parse(line);
        // Send as SSE event 'message'
        if (sseResponse) {
            sseResponse.write(\`event: message\\ndata: \${line}\\n\\n\`);
        }
    } catch (e) {
        console.error('Non-JSON output from child:', line);
    }
  }
});

app.listen(PORT, () => {
    console.error(\`MCP Bridge running on port \${PORT}\`);
});
`;

// Helper: Connect/Reuse Sandbox (Copied from other files, should be shared)
const connectToSandbox = async (sandboxID?: string): Promise<Sandbox> => {
    if (!process.env.E2B_API_KEY) throw new Error("Missing E2B_API_KEY");
    if (sandboxID) {
        try {
            return await Sandbox.connect(sandboxID);
        } catch {
            return await Sandbox.create();
        }
    }
    return await Sandbox.create();
};

// ============================================================================
// TOOL: install_mcp_bridge
// ============================================================================
export const install_mcp_bridge = createTool({
    description: "Prepare the sandbox for MCP by installing the bridge script and dependencies.",
    schema: createToolSchema({
        sandboxID: stringProp("Sandbox ID"),
    }),
    execute: async ({ sandboxID }) => {
        try {
            const sbx = await connectToSandbox(sandboxID as string | undefined);
            
            // 1. Write the bridge script (TS/JS? We'll write JS to avoid compilation complexity in sandbox)
            // But wait, the content above uses 'import'. We need package.json with "type": "module" OR use .mjs
            await sbx.files.write("mcp-bridge.mjs", BRIDGE_SCRIPT_CONTENT);
            
            // 2. Install dependencies (express AND sdk)
            // We assume 'npm' is available.
            // We need the full MCP SDK for the bridge logic because we import from it.
            await sbx.commands.run("npm install express @modelcontextprotocol/sdk");
            
            return {
                success: true,
                message: "MCP Bridge installed. Ready to start servers.",
                sandboxID: sbx.sandboxId
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    }
});

// ============================================================================
// TOOL: start_mcp_server
// ============================================================================
export const start_mcp_server = createTool({
    description: "Start an MCP server in the sandbox using the bridge. (e.g. 'npx -y @modelcontextprotocol/server-sqlite')",
    schema: createToolSchema({
        command: stringProp("Command to run the MCP server (e.g. 'npx -y @modelcontextprotocol/server-sqlite --memory')"),
        sandboxID: stringProp("Sandbox ID"),
        serverName: stringProp("Name of the MCP server as registered (e.g. 'brave-search', 'github'). Used to fetch secure configuration."),
        env: {
            type: "object",
            additionalProperties: { type: "string" },
            description: "Additional environment variables (optional, lower priority than secure config)"
        } satisfies JSONSchema7,
    }, ["command"]),
    execute: async ({ command, sandboxID, serverName, env }) => {
        try {
             // Resolve secure env vars if serverName is provided
             let secureEnv: Record<string, string> = {};
             if (serverName) {
                 try {
                     const { createClient } = await import("@/server/services/supabase/server");
                     const { decrypt } = await import("@/lib/server/encryption");
                     
                     const supabase = await createClient();
                     if (!supabase) {
                       throw new Error("Supabase client not initialized");
                     }
                     // We need the user to query their specific config
                     const { data: { user } } = await supabase.auth.getUser();
                     
                     if (user) {
                         const { data: config } = await supabase
                            .from('user_mcp_config')
                            .select('config_overrides, mcp_registry!inner(name)')
                            .eq('user_id', user.id)
                            .eq('mcp_registry.name', serverName)
                            .single();

                         if (config?.config_overrides) {
                             const overrides = config.config_overrides as Record<string, UntypedJson>;
                             if (typeof overrides.encrypted === "string") {
                                 const decryptedJson = decrypt(overrides.encrypted);
                                 secureEnv = JSON.parse(decryptedJson);
                             } else if (overrides.env && typeof overrides.env === "object") {
                                 // Legacy/Fallback (though we shouldn't really have this if we enforce encryption)
                                 secureEnv = overrides.env as Record<string, string>;
                             }
                         }
                     }
                 } catch (err) {
                     logger.warn(`[start_mcp_server] Failed to fetch secure config for ${serverName}:`, err);
                     // Continue without secure env, or fail? 
                     // Let's continue, maybe they passed everything in `env` (legacy support)
                 }
             }

             const finalEnv = { ...secureEnv, ...(env as Record<string, string> || {}) };

             const sbx = await connectToSandbox(sandboxID as string | undefined);
             
             // Run the bridge with the command
             // nohup node mcp-bridge.mjs <command> &
             const fullCommand = `nohup node mcp-bridge.mjs ${command} > /dev/null 2>&1 &`;
             // Pass env vars if provided
             await sbx.commands.run(fullCommand as string, { envs: finalEnv });
             
             // Wait a bit
             await new Promise(r => setTimeout(r, 2000));
             
             // Get URL
             const mcpUrl = buildSandboxMcpUrl(sbx);

             return {
                 success: true,
                 mcpUrl,
                 sandboxID: sbx.sandboxId
             };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    }
});

// ============================================================================
// TOOL: call_mcp_tool
// ============================================================================
export const call_mcp_tool = createTool({
    description: "Call a tool on the running MCP server in the sandbox.",
    schema: createToolSchema({
        toolName: stringProp("Name of the tool to call"),
        args: stringProp("JSON string of arguments"), // stringified JSON to avoid schema complexity issues
        sandboxID: stringProp("Sandbox ID"),
    }, ["toolName", "args", "sandboxID"]),
    execute: async ({ toolName, args, sandboxID }) => {
        try {
             const sbx = await connectToSandbox(sandboxID as string | undefined);

             const mcpUrl = buildSandboxMcpUrl(sbx, "/mcp");

             const client = new Client(
                {
                    name: "nexis-agent",
                    version: "1.0.0",
                },
                {
                    capabilities: {},
                }
             );

             // Connect
             const transport = new SSEClientTransport(new URL(mcpUrl));
             await client.connect(transport);

             // Call tool
             const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
             const result = await client.callTool({
                 name: toolName as string,
                 arguments: parsedArgs as Record<string, UntypedJson>
             });

             await client.close(); // Close after use (stateless for now)

             return {
                 success: true,
                 result: result
             };
             
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    }
});

// ============================================================================
// TOOL: list_mcp_tools
// ============================================================================
export const list_mcp_tools = createTool({
    description: "List available tools from the running MCP server.",
    schema: createToolSchema({
        sandboxID: stringProp("Sandbox ID"),
    }, ["sandboxID"]),
    execute: async ({ sandboxID }) => {
        try {
             const sbx = await connectToSandbox(sandboxID as string | undefined);

             const mcpUrl = buildSandboxMcpUrl(sbx, "/mcp");

             const client = new Client(
                {
                    name: "nexis-agent",
                    version: "1.0.0",
                },
                {
                    capabilities: {},
                }
             );

             const transport = new SSEClientTransport(new URL(mcpUrl));
             await client.connect(transport);

             const tools = await client.listTools();
             await client.close();
             
             return {
                 success: true,
                 tools: tools.tools
             };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
        }
    }
});
