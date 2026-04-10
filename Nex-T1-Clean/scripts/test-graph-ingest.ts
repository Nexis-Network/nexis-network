
import { ingestGraphData, Entity, Relationship } from "../src/lib/graph/ingest";
import { cypherQuery } from "../src/lib/graph";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function main() {
  const url = process.env.FALKORDB_URL;
  if (!url) {
    console.warn("⚠️  Skipping test: FALKORDB_URL not set in .env.local");
    return;
  }

  console.log("Redis URL found:", url.replace(/:[^:]*@/, ":***@")); // Mask password if any

  try {
    const graphName = "nex-test-graph";

    // 1. Define Data
    const entities: Entity[] = [
      { id: "user:test_01", label: "Person", properties: { name: "Alice Test", role: "admin" } },
      { id: "token:NEX", label: "Token", properties: { symbol: "NEX", chain: "Ethereum" } },
    ];

    const relationships: Relationship[] = [
      {
        sourceId: "user:test_01",
        targetId: "token:NEX",
        type: "OWNS",
        properties: { amount: 1000, since: "2024-01-01" },
      },
    ];

    // 2. Ingest
    console.log("Ingesting data...");
    await ingestGraphData(graphName, entities, relationships);

    // 3. Verify
    console.log("Verifying data...");
    const result = await cypherQuery(graphName, "MATCH (p:Person)-[r:OWNS]->(t:Token) RETURN p.name, t.symbol, r.amount");
    
    console.log("Query Result:", result);

    if (Array.isArray(result) && result.length > 0) {
      console.log("✅ Success! Graph ingestion verified.");
    } else {
      console.error("❌ Failed: Query returned no results.");
    }

  } catch (error) {
    console.error("❌ Error running graph test:", error);
  } finally {
    process.exit(0);
  }
}

main();
