import { recordEdgeSession } from "../src/server/auth/session-log-edge";

async function main() {
    console.log("Testing recordEdgeSession with current configuration...");

    // Mock params
    const params = {
        userId: "debug-user",
        ip: "127.0.0.1",
        userAgent: "debug-script",
        tokenHash: "debug-token"
    };

    try {
        await recordEdgeSession(params);
        console.log("✅ recordEdgeSession called (check logs above for warnings)");
    } catch (error) {
        console.error("❌ recordEdgeSession threw an error (unexpected):", error);
    }
}

main();
