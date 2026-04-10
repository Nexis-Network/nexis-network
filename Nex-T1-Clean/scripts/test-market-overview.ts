
import { GET } from "../src/app/api/analytics/market-overview/overview/route";

// Mock Request
const req = new Request("http://localhost:3000/api/analytics/market-overview/overview?assets=ETH,BTC");

async function run() {
    console.log("Testing Market Overview API...");
    try {
        const response = await GET(req);
        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("Response Data:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error running test:", error);
    }
}

run();
