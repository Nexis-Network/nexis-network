import { createRedisClient } from "../src/server/services/redis/factory";
import { resolveStandardRedisConfig } from "../src/lib/utils/redis-config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main() {
    console.log("🔍 Starting Redis Connectivity Test...");

    const config = resolveStandardRedisConfig();
    if (!config) {
        console.error("❌ Redis is not configured. Please check your environment variables.");
        process.exit(1);
    }

    console.log("📋 Configuration:");
    console.log(`   URL: ${config.url.replace(/:[^:@]+@/, ":****@")}`); // Mask password
    console.log(`   Token: ${config.token ? "Set" : "Not Set"}`);

    const client = createRedisClient();

    if (!client) {
        console.error("❌ Failed to create Redis client.");
        process.exit(1);
    }

    try {
        console.log("⏳ Connecting...");
        await client.ping();
        console.log("✅ Connected successfully!");

        const key = "test:connectivity:timestamp";
        const value = new Date().toISOString();

        console.log(`📝 Writing test key: ${key} = ${value}`);
        await client.set(key, value, { ex: 60 });

        console.log("📖 Reading test key...");
        const readValue = await client.get(key);

        if (readValue === value) {
            console.log("✅ Read/Write verification passed!");
        } else {
            console.error(`❌ Read/Write verification failed. Expected ${value}, got ${readValue}`);
        }

        console.log("⏱️  Measuring latency...");
        const start = Date.now();
        await client.ping();
        const latency = Date.now() - start;
        console.log(`   Latency: ${latency}ms`);

    } catch (error) {
        console.error("❌ Redis test failed:", error);
    }
    // No quit() needed for Upstash HTTP client
}

main().catch(console.error);
