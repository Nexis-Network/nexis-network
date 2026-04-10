import {
    BedrockAgentCoreClient,
    CreateEventCommand,
    RetrieveMemoryRecordsCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { bedrockAgentCoreClient } from "./client";
import { bedrockConfig, isBedrockConfigured, warnMissing } from "./config";


import { logger } from '@/lib/logger';
// Strategy IDs provided by configuration / env
export const MEMORY_STRATEGIES = {
    SUMMARY: bedrockConfig.memory.strategies.summary,
    SEMANTIC: bedrockConfig.memory.strategies.semantic,
    PREFERENCE: bedrockConfig.memory.strategies.preference,
};

export class BedrockCoreMemory {
    private client: BedrockAgentCoreClient;
    private memoryId: string;
    private hasWarnedMissingId: boolean;

    constructor() {
        this.client = bedrockAgentCoreClient;
        this.memoryId = bedrockConfig.memory.id;
        this.hasWarnedMissingId = false;
        if (isBedrockConfigured()) {
            warnMissing("BEDROCK/AWS region", bedrockConfig.region);
            warnMissing("AWS_ACCESS_KEY_ID", bedrockConfig.credentials.accessKeyId);
            warnMissing("AWS_SECRET_ACCESS_KEY", bedrockConfig.credentials.secretAccessKey);
        }
    }

    private ensureMemoryConfigured(): boolean {
        if (!isBedrockConfigured()) return false;
        if (this.memoryId) return true;
        if (!this.hasWarnedMissingId) {
            warnMissing("BEDROCK_MEMORY_ID", this.memoryId);
            this.hasWarnedMissingId = true;
        }
        return false;
    }

    /**
     * Ingest a chat event into Bedrock Agent Core
     */
    async ingestEvent(params: {
        sessionId: string;
        actorId: string;
        role: "USER" | "ASSISTANT";
        text: string;
    }): Promise<void> {
        if (!this.ensureMemoryConfigured()) return;

        try {
            const command = new CreateEventCommand({
                memoryId: this.memoryId,
                actorId: params.actorId,
                sessionId: params.sessionId,
                eventTimestamp: new Date(),
                payload: [
                    {
                        conversational: {
                            role: params.role,
                            content: {
                                text: params.text,
                            },
                        },
                    },
                ],
                // We don't explicitly set namespace here for ingestion; 
                // events are usually tied to session/actor and strategies pick them up.
                // However, if strategies require specific namespaces, we might need to adjust.
                // Based on standard usage, CreateEvent is enough.
            });

            await this.client.send(command);
            // logger.debug(`[BedrockCoreMemory] Ingested event for session ${params.sessionId}`);
        } catch (error) {
            logger.error("[BedrockCoreMemory] Failed to ingest event:", error);
        }
    }

    /**
     * Retrieve relevant memories from all strategies
     */
    async retrieveRelevantMemory(actorId: string, query: string): Promise<string> {
        if (!this.ensureMemoryConfigured()) return "";

        const strategyIds = [
            MEMORY_STRATEGIES.SUMMARY,
            MEMORY_STRATEGIES.SEMANTIC,
            MEMORY_STRATEGIES.PREFERENCE,
        ].filter(Boolean);

        if (strategyIds.length === 0) return "";

        const promises = strategyIds.map(strategyId =>
            this.retrieveFromStrategy(strategyId, actorId, query),
        );

        const results = await Promise.all(promises);
        const combined = results.filter(Boolean).join("\n\n");
        return combined ? `<user_memory>\n${combined}\n</user_memory>` : "";
    }

    private async retrieveFromStrategy(strategyId: string, actorId: string, query: string): Promise<string | null> {
        try {
            // Namespace format: /strategies/{memoryStrategyId}/actors/{actorId}
            const namespace = `/strategies/${strategyId}/actors/${actorId}`;

            const command = new RetrieveMemoryRecordsCommand({
                memoryId: this.memoryId,
                namespace: namespace,
                searchCriteria: {
                    searchQuery: query,
                    memoryStrategyId: strategyId,
                    topK: 3,
                },
            });

            const response = await this.client.send(command);

            if (!response.memoryRecordSummaries || response.memoryRecordSummaries.length === 0) {
                return null;
            }

            const records = response.memoryRecordSummaries
                .map(r => r.content?.text)
                .filter(Boolean);

            if (records.length === 0) return null;

            const title = this.getStrategyTitle(strategyId);
            return `<memory_category name="${title}">\n${records.map(r => `- ${r}`).join("\n")}\n</memory_category>`;
        } catch {
            // logger.warn(`[BedrockCoreMemory] Failed to retrieve from ${strategyId}:`, _error);
            return null;
        }
    }

    private getStrategyTitle(strategyId: string): string {
        switch (strategyId) {
            case MEMORY_STRATEGIES.SUMMARY: return "Conversation Summary";
            case MEMORY_STRATEGIES.SEMANTIC: return "Relevant Facts";
            case MEMORY_STRATEGIES.PREFERENCE: return "User Preferences";
            default: return "Memory";
        }
    }
}

export const bedrockCoreMemory = new BedrockCoreMemory();
