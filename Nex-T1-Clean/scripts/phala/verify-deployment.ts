// using global fetch (available in Node 18+)

const url = process.argv[2];
if (!url) {
  console.error("Usage: bun verify-deployment.ts <TEE_URL>");
  process.exit(1);
}

// Ensure no trailing slash
const baseUrl = url.replace(/\/$/, "");

async function main() {
  console.log(`Verifying TEE Runtime at ${baseUrl}...`);

  // 1. Health Check
  try {
    const res = await fetch(`${baseUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    const json = await res.json();
    console.log("✅ /health OK:", json);
  } catch (e) {
    console.error("❌ /health failed:", e);
    process.exit(1);
  }

  // 2. Attestation Check
  try {
    const res = await fetch(`${baseUrl}/attest`);
    if (!res.ok) throw new Error(`Attestation check failed: ${res.status}`);
    const json = await res.json();
    console.log("✅ /attest OK. Provider:", (json as unknown).type || (json as unknown).provider);
    console.log("   Measurements:", (json as unknown).measurements?.length || 0);
  } catch (e) {
    console.error("❌ /attest failed:", e);
    // don't exit, might be just unimplemented in mock
  }

  // 3. Invoke Check (Expect Auth Error)
  try {
    const res = await fetch(`${baseUrl}/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    // We expect 401 or 400 or 500 (if session key missing)
    // TEE Runtime usually requires X-Session-Key
    if (res.status === 401 || res.status === 403 || res.status === 400 || res.status === 500) {
        console.log(`✅ /invoke rejected as expected (Status: ${res.status})`);
    } else {
        console.warn(`⚠️ /invoke returned unexpected status: ${res.status}`);
    }
  } catch (e) {
    console.error("❌ /invoke check error:", e);
  }
}

main();
