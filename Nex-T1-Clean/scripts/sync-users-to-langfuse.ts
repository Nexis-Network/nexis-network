import "dotenv/config";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Langfuse } from "langfuse";

dotenv.config({ path: ".env.local" });

const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASEURL ?? "https://cloud.langfuse.com",
});

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function main() {
    console.log("Starting user sync to Langfuse...");

    let page = 1;
    const perPage = 50;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: perPage,
        });

        if (error) {
            console.error("Error fetching users from Supabase:", error);
            break;
        }

        if (!users || users.length === 0) {
            hasMore = false;
            break;
        }

        console.log(`Processing batch ${page} (${users.length} users)...`);

        for (const user of users) {
            try {
                // Create a trace to register the user in Langfuse
                // We use a dummy trace name "user-sync"
                langfuse.trace({
                    name: "user-sync",
                    userId: user.id,
                    metadata: {
                        email: user.email,
                        created_at: user.created_at,
                        last_sign_in_at: user.last_sign_in_at,
                        // Add other relevant user metadata if available
                        ...user.user_metadata,
                    },
                });
                totalSynced++;
            } catch (err) {
                console.error(`Failed to sync user ${user.id}:`, err);
            }
        }

        page++;
    }

    console.log(`Flushing events to Langfuse... (Total: ${totalSynced})`);
    await langfuse.flushAsync();
    await langfuse.shutdownAsync();
    console.log("User sync complete.");
}

main().catch(console.error);
