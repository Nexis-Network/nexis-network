import { parseArgs } from "util";

const args = parseArgs({
  options: {
    quick: { type: "boolean" },
    "functions-fallback": { type: "boolean" },
    "strict-market": { type: "boolean" },
    url: { type: "string" },
    "functions-url": { type: "string" },
  },
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  strict: false,
});

const BASE_URL = args.values.url || "http://localhost:3000";
const FUNCTIONS_URL = args.values["functions-url"] || "http://localhost:54321/functions/v1";

console.log("Process Argv:", process.argv);
console.log("Parsed Args:", args.values);
console.log(`Testing Market Routes...`);
console.log(`Next.js URL: ${BASE_URL}`);
console.log(`Functions URL: ${FUNCTIONS_URL}`);

async function checkRoute(label: string, url: string) {
  try {
    const start = performance.now();
    const res = await fetch(url);
    const end = performance.now();
    const duration = Math.round(end - start);
    
    if (res.ok) {
        const type = res.headers.get("content-type");
        if (type?.includes("application/json")) {
            const _data = await res.json();
            console.log(`✅ ${label}: 200 OK (${duration}ms)`);
            return true;
        } else {
            console.error(`❌ ${label}: 200 OK but content-type is ${type} (${duration}ms)`);
            return false;
        }
    } else {
        console.error(`❌ ${label}: ${res.status} ${res.statusText} (${duration}ms)`);
        return false;
    }
  } catch (error) {
    console.error(`❌ ${label}: Network Error`, error);
    return false;
  }
}

async function run() {
    let success = true;

    // NEXT.JS ROUTES
    success = (await checkRoute("Next.js Price (BTC)", `${BASE_URL}/api/extension/market/price?symbol=bitcoin`)) && success;
    success = (await checkRoute("Next.js Sparkline (BTC)", `${BASE_URL}/api/extension/market/sparkline?symbol=bitcoin&days=7`)) && success;

    // FUNCTIONS ROUTES
    if (!args.values["functions-fallback"]) {
        success = (await checkRoute("Functions Price Route", `${FUNCTIONS_URL}/market/price?symbol=bitcoin`)) && success;
        success = (await checkRoute("Functions Sparkline Route", `${FUNCTIONS_URL}/market/sparkline?symbol=bitcoin`)) && success;
    } else {
        console.log("Skipping Functions checks (--functions-fallback)");
    }

    if (!success) {
        console.error("Some checks failed.");
        if (args.values["strict-market"]) {
            process.exit(1);
        }
    } else {
        console.log("All checks passed!");
    }
}

run();
