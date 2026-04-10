#!/usr/bin/env node
import "dotenv/config";
import { BedrockAgentClient, ListAgentAliasesCommand } from "@aws-sdk/client-bedrock-agent";

const agentId = process.env.BEDROCK_AGENT_ID;
const region = process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-east-1";

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.");
  process.exit(1);
}

if (!agentId) {
  console.error("Missing BEDROCK_AGENT_ID. Set it in your .env/.env.local.");
  process.exit(1);
}

async function main() {
  const client = new BedrockAgentClient({ region });
  const res = await client.send(new ListAgentAliasesCommand({ agentId }));
  console.log(`Region: ${region}`);
  console.log(`Agent: ${agentId}`);
  console.table(
    (res.agentAliasSummaries || []).map((a) => ({
      name: a.agentAliasName,
      aliasId: a.agentAliasId,
      status: a.agentAliasStatus,
      createdAt: a.createdAt?.toISOString?.() ?? "",
    })),
  );
}

main().catch((err) => {
  console.error("Failed to list aliases:", err);
  process.exit(1);
});
