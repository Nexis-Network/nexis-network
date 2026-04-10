import { bedrockAgentRuntimeClient } from "./client";
import { InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { shortTermMemory } from "./memory";


import { logger } from '@/lib/logger';
export interface AgentRequest {
    sessionId: string;
    inputText: string;
    agentId: string;
    agentAliasId: string;
}

export class BedrockAgentRuntime {
    async invokeAgent(request: AgentRequest) {
        const { sessionId, inputText, agentId, agentAliasId } = request;

        // Persist input to short-term memory (optional, as Bedrock handles session state usually)
        await shortTermMemory.set(`session:${sessionId}:last-input`, inputText);

        try {
            const command = new InvokeAgentCommand({
                agentId,
                agentAliasId,
                sessionId,
                inputText,
                enableTrace: true, // For observability
            });

            const response = await bedrockAgentRuntimeClient.send(command);

            // Process response stream
            // Note: response.completion is an AsyncIterable
            return response.completion;

        } catch (error) {
            logger.error("[BedrockAgentRuntime] invokeAgent failed", error);
            throw error;
        }
    }
}

export const bedrockAgentRuntime = new BedrockAgentRuntime();
