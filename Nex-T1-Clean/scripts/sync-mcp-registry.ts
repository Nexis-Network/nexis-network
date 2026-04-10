
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
// Note: getMcpRegistry import removed - script implements fetch logic directly for standalone operation

const REGISTRY_URL = "https://raw.githubusercontent.com/Nexis-AI/Ultimate-Catalog-of-Web3-DeFi-Crypto-MCP-Servers-for-Secure-On-Chain-Operations/main/registry.json";

async function syncRegistry() {
    console.log("🔄 Syncing MCP Registry...");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // Role key needed for writing to registry usually

    if (!url || !key) {
        console.error("❌ Missing Supabase SERVICE_ROLE_KEY");
        process.exit(1);
    }

    const supabase = createClient(url, key);

    try {
        // Fetch JSON
        const res = await fetch(REGISTRY_URL);
        const data = await res.json();
        
        console.log(`📥 Fetched ${data.servers.length} servers from GitHub.`);

        for (const server of data.servers) {
            // Upsert into mcp_registry
            // Schema has: name, scre_url, transport, is_public, tool_allowlist
            // Registry JSON has: name, description, vendor, source, env...
            
            // MAPPING ISSUE: 
            // Registry JSON source.type might be 'docker' or 'npm'.
            // mcp_registry table has 'sre_url' and 'transport'. 
            // This table seems designed for specific INTERNAL deployments (sre_url implies SRE managed).
            // BUT user wants to use the Catalog.
            // If the Catalog Servers are mostly 'npm' packages we run in E2B, they don't have a static URL.
            // They are dynamic.
            
            // Reuse 'sre_url' for 'source.location' (npm package name)? AND 'transport' for 'stdio'?
            // Constraint: transport in ('sse', 'http'). 
            // E2B uses stdio bridge... but we bridge it to SSE.
            // So we can set transport = 'sse' and sre_url = 'e2b://<package-name>'.
            
            // Let's assume we can map it.
            const payload = {
                name: server.name,
                // We'll store the full source config in description or a new column? 
                // Table doesn't have 'source' or 'vendor'. 
                // It seems the table schema (from 20251229) is slightly different from the Registry JSON schema.
                // Table is for *Active* services?
                // Or maybe I should just ignore the table columns that don't fit and rely on JSON for metadata?
                // But I need UUID.
                
                // Let's coerce:
                // sre_url -> JSON.stringify(server.source) (Hack?)
                // Or proper: 'e2b-managed'
                sre_url: JSON.stringify(server.source), 
                transport: 'sse', // Defaulting
                is_public: true
            };

            const { error } = await supabase.from('mcp_registry').upsert(payload, { onConflict: 'name' });
            
            if (error) {
                console.error(`❌ Failed to sync ${server.name}:`, error.message);
            } else {
                console.log(`✅ Synced ${server.name}`);
            }
        }
        
    } catch (e) {
        console.error("Sync failed:", e);
    }
}

syncRegistry();
