
import { config } from "dotenv";
config({ path: ".env.local" });
import { install_mcp_bridge, start_mcp_server, list_mcp_tools, call_mcp_tool } from "../modules/ai/tools/e2b-mcp";

import { logger } from '@/lib/logger';
import type { MockToolContext } from "@/types/e2b-sandbox";

/**
 * Helper to invoke the `execute` function on an AI SDK Tool.
 *
 * The Tool type's `execute` is typed as `ToolExecuteFunction<any, any>`
 * but may be undefined. This helper provides runtime safety and proper
 * return typing for the test harness.
 */
function executeTool(
    tool: { execute?: (input: UntypedJson, options: UntypedJson) => Promise<UntypedJson> },
    input: Record<string, UntypedJson>,
    ctx: MockToolContext,
): Promise<Record<string, UntypedJson>> {
    if (!tool.execute) {
        throw new Error("Tool has no execute function");
    }
    return tool.execute(input, ctx) as Promise<Record<string, UntypedJson>>;
}

async function testFullMcpFlow() {
    logger.debug("Starting Full E2B MCP Integration Test...");

    if (!process.env.E2B_API_KEY) {
        logger.error("E2B_API_KEY missing");
        process.exit(1);
    }

    try {
        // 1. Create Sandbox (Manual step to get ID, or let tool handle it)
        // We'll let the tool handle it, but catch the ID from result to reuse
        logger.debug("\n[1/5] Installing Bridge...");
        const installRes = await executeTool(
            install_mcp_bridge,
            {},
            { toolCallId: '1', metadata: { sandbox_id: undefined } },
        );

        if (!installRes.success) {
            throw new Error(`Install failed: ${installRes.error}`);
        }

        const sandboxID = installRes.sandboxID as string;
        logger.debug(`Bridge Installed. Sandbox ID: ${sandboxID}`);

        // 2. Start MCP Server (Memory Server)
        logger.debug("\n[2/5] Starting Memory MCP Server...");
        // This command runs npx to install and run the memory server
        const startRes = await executeTool(
            start_mcp_server,
            {
                command: "npx -y @modelcontextprotocol/server-memory",
                sandboxID,
            },
            { toolCallId: '2', metadata: { sandbox_id: undefined } },
        );

        if (!startRes.success) {
            throw new Error(`Start failed: ${startRes.error}`);
        }

        logger.debug(`Server Started. MCP URL: ${startRes.mcpUrl}`);

        // 3. List Tools
        logger.debug("\n[3/5] Listing Tools...");
        // Wait a few seconds for npx to finish installing and server to boot
        logger.debug("   (Waiting 10s for npx install & boot...)");
        await new Promise(r => setTimeout(r, 10000));

        const listRes = await executeTool(
            list_mcp_tools,
            { sandboxID },
            { toolCallId: '3', metadata: { sandbox_id: undefined } },
        );

        if (!listRes.success) {
             throw new Error(`List tools failed: ${listRes.error}`);
        }

        logger.debug("Tools Found:", JSON.stringify(listRes.tools, null, 2));

        // 4. Call Tool (create_graph_entities - memory server has specific tools)
        // Memory server tools: read_graph, create_graph_entities, delete_graph_entities, etc.
        logger.debug("\n[4/5] Calling Tool 'create_entities'...");

        const callRes = await executeTool(
            call_mcp_tool,
            {
                sandboxID,
                toolName: "create_entities",
                args: JSON.stringify({
                    entities: [{ name: "Next.js", entityType: "Framework", observations: ["React-based"] }]
                }),
            },
            { toolCallId: '4', metadata: { sandbox_id: undefined } },
        );

        if (!callRes.success) {
              throw new Error(`Call tool failed: ${callRes.error}`);
        }

        logger.debug("Tool Call Result:", callRes.result);

        // 5. Verify Persistence (Read back)
         logger.debug("\n[5/5] Calling Tool 'read_graph'...");
         const readRes = await executeTool(
            call_mcp_tool,
            {
                sandboxID,
                toolName: "read_graph",
                args: JSON.stringify({}),
            },
            { toolCallId: '5', metadata: { sandbox_id: undefined } },
        );

         logger.debug("Read Result:", JSON.stringify(readRes.result, null, 2));

    } catch (err) {
        logger.error("Test Failed:", err);
    } finally {
        logger.debug("Cleanup...");
        // We typically don't kill the sandbox in 'tools', but for test we should clean up if we had a handle.
        // The tools only return ID. We'd need to connect to kill.
        // We'll leave it to timeout or manual cleanup.
    }
}

testFullMcpFlow();
