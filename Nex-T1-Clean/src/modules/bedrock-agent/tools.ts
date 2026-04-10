import { registryService } from "@/modules/mcp/registry-service";
import type { ToolDefinition } from "@/modules/ai/system-guidance";

// Define Bedrock Tool types based on AWS SDK if available, or generic for now
export interface BedrockTool {
    toolSpec: {
        name: string;
        description?: string;
        inputSchema: {
            json: Record<string, UntypedJson>;
        };
    };
}

export class BedrockToolsAdapter {
    async getTools(): Promise<BedrockTool[]> {
        const tools = await registryService.getAllTools();
        return tools.map(this.convertToBedrockTool);
    }

    private convertToBedrockTool(tool: ToolDefinition): BedrockTool {
        return {
            toolSpec: {
                name: tool.id, // Assuming id is the name
                description: tool.description,
                inputSchema: {
                    json: tool.input_schema || {}, // Assuming input_schema exists on ToolDefinition
                },
            },
        };
    }
}

export const bedrockToolsAdapter = new BedrockToolsAdapter();
