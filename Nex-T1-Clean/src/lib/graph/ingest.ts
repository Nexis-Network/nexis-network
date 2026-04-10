/**
 * Graph Ingestion Service
 * 
 * Domain: AI - GraphRAG
 * Responsibility: Helpers to insert nodes and edges into FalkorDB
 */

import { cypherQuery } from "@/lib/graph";


import { logger } from '@/lib/logger';
export interface Entity {
  id: string; // unique identifier (e.g. "token:NEX")
  label: string; // e.g. "Token", "Person"
  properties: Record<string, string | number | boolean>;
}

export interface Relationship {
  sourceId: string;
  targetId: string;
  type: string; // e.g. "OWNS", "CREATED"
  properties?: Record<string, string | number | boolean>;
}

/**
 * sanitizes values for Cypher queries (simple escaping)
 */
function escapeVal(val: string | number | boolean): string {
  if (typeof val === "string") return `'${val.replace(/'/g, "\\'")}'`;
  return String(val);
}

/**
 * Convert properties object to Cypher map string: {key: 'val', key2: 123}
 */
function propsToCypher(props: Record<string, UntypedJson>): string {
  const parts = Object.entries(props).map(([k, v]) => `${k}: ${escapeVal(v)}`);
  return `{${parts.join(", ")}}`;
}

/**
 * Ingest a batch of entities and relationships
 */
export async function ingestGraphData(
  graphName: string,
  entities: Entity[],
  relationships: Relationship[]
) {
  // We'll do this naively for now with MERGE statements
  // A more optimized approach would use UNWIND or specific bulk import logic
  
  if (entities.length === 0 && relationships.length === 0) return;

  const statements: string[] = [];

  // 1. Merge Nodes
  for (const entity of entities) {
    // Assuming 'id' property is the unique key for MERGE
    // MERGE (n:Label {id: 'val'}) SET n += {other_props}
    const { id, label, properties } = entity;
    // Separate id from other props for the MERGE key
    const mergeKey = `id: ${escapeVal(id)}`;
    const otherProps = { ...properties }; // copy
    
    // Construct query
    // Using string/number keys in MERGE can be tricky in RedisGraph if structured uniquely
    // Simplified: MERGE (n:Label {id: '...'})
    statements.push(
      `MERGE (n:${label} {${mergeKey}}) SET n += ${propsToCypher(otherProps)}`
    );
  }

  // 2. Merge Edges
  for (const rel of relationships) {
    // MATCH (a), (b) WHERE a.id = ... AND b.id = ... MERGE (a)-[:TYPE]->(b)
    const { sourceId, targetId, type, properties } = rel;
    
    statements.push(
      `MATCH (a), (b) WHERE a.id = ${escapeVal(sourceId)} AND b.id = ${escapeVal(targetId)} ` +
      `MERGE (a)-[r:${type}]->(b)` + 
      (properties ? ` SET r += ${propsToCypher(properties)}` : "")
    );
  }

  // Execute in small batches or one transaction if supported
  // RedisGraph supports multiple queries in one request implicitly? 
  // Commonly we just send them sequentially or grouped.
  // For safety, let's run them sequentially for this V1.
  
  logger.debug(`[GraphIngest] Ingesting ${entities.length} nodes and ${relationships.length} edges...`);
  
  for (const stmt of statements) {
    await cypherQuery(graphName, stmt);
  }
  
  logger.debug(`[GraphIngest] Ingestion complete.`);
}
