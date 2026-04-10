
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
// Note: getWalletPortfolio/getWalletNetWorth imports removed - script tests raw Birdeye API endpoints

async function main() {
    console.log("Testing Birdeye Wallet Data...");

    // Use a known Solana wallet (or EVM if supported)
    // Solana Vitalik or random whale: 5Q544fKrLfPDxthjHKQZz3P8K95X8tDj7X2k9R2n6xg5  (example)
    // Or just use a random string if Birdeye handles it gracefully.
    // Let's use a real Solana address.
    const TEST_WALLET = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"; // Raydium Authority or similar
    

    const probes = [
        "/v1/wallet/token_list",
        "/v2/wallet/token_list", // Failed
        "/v1/wallet/net_worth",
        "/v2/wallet/net_worth",
        "/defi/v3/token/list" // Just to check connectivity
    ];

    const apiKey = process.env.BIRDEYE_API_KEY!;
    
    for (const path of probes) {
        console.log(`\nProbing ${path}...`);
        try {
           const url = `https://public-api.birdeye.so${path}?wallet=${TEST_WALLET}&type=1d`;
           const res = await fetch(url, {
               headers: {
                   "x-api-key": apiKey,
                   "x-chain": "solana",
                   "accept": "application/json"
               }
           });
           
           console.log(`Status: ${res.status}`);
           const text = await res.text();
           if (text.startsWith("<")) {
               console.log("Response is HTML (Likely 404/Redirect/Docs)");
           } else {
               console.log("Response Type: JSON");
               // console.log("Body preview:", text.substring(0, 200));
               if (res.ok) {
                   console.log("SUCCESS");
               } else {
                   console.log("FAILED (API Error)");
               }
           }

        } catch (e: unknown) {
            console.error("Fetch error:", e.message);
        }
    }
}

main();
