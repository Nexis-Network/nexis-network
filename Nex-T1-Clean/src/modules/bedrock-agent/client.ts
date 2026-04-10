import { BedrockAgentCoreClient } from "@aws-sdk/client-bedrock-agentcore";
import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";
import { bedrockConfig } from "./config";

const REGION = bedrockConfig.region;

export const bedrockAgentCoreClient = new BedrockAgentCoreClient({
    region: REGION,
    credentials: bedrockConfig.credentials,
});

export const bedrockAgentRuntimeClient = new BedrockAgentRuntimeClient({
    region: REGION,
    credentials: bedrockConfig.credentials,
});
