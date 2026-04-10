import fs from 'fs';

import dotenv from 'dotenv';

// Load .env.local if valid
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config(); // Load .env as fallback/supplement

// Configuration
const BETTERSTACK_API_TOKEN = process.env.BETTERSTACK_API_TOKEN;
// Prioritize APP_URL (CLI override) -> NEXT_PUBLIC_APP_URL (.env) -> Hardcoded Prod
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://nex-t1.ai';
const DRUN_RUN = process.env.VERIFY_DRY_RUN === '1';
const API_BASE = 'https://uptime.betterstack.com/api/v2';

if (!BETTERSTACK_API_TOKEN) {
  console.error('❌ BETTERSTACK_API_TOKEN is missing in environment variables.');
  process.exit(1);
}

if (!APP_URL) {
  console.error('❌ APP_URL / NEXT_PUBLIC_APP_URL is missing. Cannot construct monitor URLs.');
  process.exit(1);
}

// --- DESIRED STATE CONFIGURATION ---

const DESIRED_MONITORS = [
  '/api/notifications',
  '/api/wallets/native-balance',
  '/api/profile',
  '/api/nex/wallets/summary',
  '/api/nex/leaderboard',
  '/api/xp/claim',
  '/api/settings/overview/networth',
  '/changelog',
  'https://mcp.nex-t1.ai/mcp', 
];

const DESIRED_HEARTBEATS = [
  { name: 'CRON: Market Data', period: 3600, grace: 300 }, // 1h
  { name: 'CRON: Check Conditions', period: 300, grace: 60 }, // 5m
  { name: 'Worker: Tasks Dispatch', period: 300, grace: 60 },
  { name: 'Worker: Tasks Run', period: 300, grace: 60 },
  { name: 'Database Backup', period: 86400, grace: 3600 }, // 24h
  { name: 'CRON: Default', period: 86400, grace: 3600 }, // 24h
  { name: 'Worker: Chat Consumer', period: 300, grace: 60 },
];

// --- TYPES ---

interface Monitor {
  id: string;
  attributes: {
    url: string;
    pronounceable_name: string;
    paused: boolean;
  };
}

interface Heartbeat {
  id: string;
  attributes: {
    name: string;
    period: number;
    grace: number;
    url: string; // The webhook URL to ping
    status: string;
  };
}

// --- API HELPERS ---

async function fetchAllItems(endpoint: string): Promise<unknown[]> {
  const items: unknown[] = [];
  let page = 1;
  let hasMore = true;

  console.log(`📡 Fetching existing ${endpoint}...`);

  while (hasMore) {
    const res = await fetch(`${API_BASE}/${endpoint}?page=${page}`, {
      headers: { Authorization: `Bearer ${BETTERSTACK_API_TOKEN}` },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch ${endpoint}: ${res.status} ${text}`);
    }

    const json = await res.json();
    items.push(...json.data);

    if (json.pagination && json.pagination.next) {
      page++;
    } else {
      hasMore = false;
    }
  }
  return items;
}

// --- MONITOR ACTIONS ---

async function createMonitor(url: string, name: string) {
  if (DRUN_RUN) {
    console.log(`[DRY RUN] Would create monitor for: ${url}`);
    return;
  }

  const res = await fetch(`${API_BASE}/monitors`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BETTERSTACK_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      monitor_type: 'status',
      pronounceable_name: name,
      expected_status_codes: [200, 401], // Accept 401 as "Up"
      check_frequency: 180, // 3 minutes
      recovery_period: 60, // 1 minute
      email: false, 
      sms: false,
      call: false,
      push: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (text.includes('quota')) throw new Error('Monitor quota reached');
    console.error(`❌ Failed to create monitor for ${url}: ${text}`);
  } else {
    console.log(`✅ Created: ${url}`);
  }
}

async function deleteItem(id: string, type: 'monitors' | 'heartbeats', label: string) {
  if (DRUN_RUN) {
    console.log(`[DRY RUN] Would DELETE ${type}: ${label} (${id})`);
    return;
  }

  const res = await fetch(`${API_BASE}/${type}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${BETTERSTACK_API_TOKEN}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Failed to delete ${type} ${id}: ${text}`);
  } else {
    console.log(`🗑️  Deleted: ${label}`);
  }
}

// --- HEARTBEAT ACTIONS ---

async function createHeartbeat(hb: typeof DESIRED_HEARTBEATS[0]) {
    if (DRUN_RUN) {
        console.log(`[DRY RUN] Would create heartbeat: ${hb.name}`);
        return;
    }

    const res = await fetch(`${API_BASE}/heartbeats`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${BETTERSTACK_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: hb.name,
            period: hb.period,
            grace: hb.grace,
            email: true, // Alert on missing heartbeat
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error(`❌ Failed to create heartbeat ${hb.name}: ${text}`);
    } else {
        const json = await res.json();
        console.log(`💓 Created Heartbeat: ${hb.name}`);
        console.log(`   └─ URL: ${json.data.attributes.url}`);
    }
}

// --- MAIN LOGIC ---

async function main() {
  console.log(`🚀 Starting Better Stack Sync (Strict Mode)`);
  console.log(`   Target App URL: ${APP_URL}`);
  console.log(`   Mode: ${DRUN_RUN ? 'DRY RUN' : 'LIVE'}`);
  
  // --- SYNC MONITORS ---
  console.log(`\n--- Syncing Monitors ---`);
  
  let existingMonitors: Monitor[] = [];
  try {
      existingMonitors = await fetchAllItems('monitors');
  } catch (e) {
      console.error(e);
      process.exit(1);
  }

  // 1. Cleanup Undesired Monitors
  for (const m of existingMonitors) {
      const match = DESIRED_MONITORS.find(target => {
          // Check full URL equality or relative path match
          if (target.startsWith('http')) return m.attributes.url === target;
          return m.attributes.url === `${APP_URL}${target}`;
      });

      if (!match) {
          await deleteItem(m.id, 'monitors', m.attributes.url);
      }
  }

  // 2. Create Missing Monitors
  for (const target of DESIRED_MONITORS) {
      const fullUrl = target.startsWith('http') ? target : `${APP_URL}${target}`;
      const exists = existingMonitors.find(m => m.attributes.url === fullUrl);

      if (!exists) {
         try {
             await createMonitor(fullUrl, `API: ${target}`);
             if (!DRUN_RUN) await new Promise(r => setTimeout(r, 200)); 
         } catch (e: unknown) {
             console.log(`⚠️  Error creating ${target}: ${e.message}`);
         }
      } else {
          console.log(`✅ Exists: ${target}`);
      }
  }

  // --- SYNC HEARTBEATS ---
  console.log(`\n--- Syncing Heartbeats ---`);

  let existingHeartbeats: Heartbeat[] = [];
  try {
      existingHeartbeats = await fetchAllItems('heartbeats');
  } catch (e) {
      console.error(e);
      // Don't exit, just skip heartbeats if fail
  }

  // 3. Cleanup Undesired Heartbeats
  for (const hb of existingHeartbeats) {
      const match = DESIRED_HEARTBEATS.find(target => target.name === hb.attributes.name);
      if (!match) {
          await deleteItem(hb.id, 'heartbeats', hb.attributes.name);
      }
  }

  // 4. Create/Check Heartbeats
  for (const target of DESIRED_HEARTBEATS) {
      const exists = existingHeartbeats.find(hb => hb.attributes.name === target.name);

      if (exists) {
           console.log(`✅ Exists: ${target.name}`);
           console.log(`   └─ URL: ${exists.attributes.url}`);
      } else {
          await createHeartbeat(target);
          if (!DRUN_RUN) await new Promise(r => setTimeout(r, 200));
      }
  }

  console.log('\n✨ Done.');
}

main();
