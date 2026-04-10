import { type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { sendEmailDigest } from "@/server/services/email/resend";
import { client, sanityConfigured } from "@/lib/sanity/client";
import { apiResponse } from "@/lib/api-platform";

import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabaseAdminClient();

        if (!sanityConfigured) {
            return apiResponse.error("CONFIG_ERROR", "Sanity is not configured on this environment", 500);
        }

        // 1. Verify Authentication (Admin only)
        // In a real scenario, you'd check the session or a secret key.
        // For this implementation, we'll assume a secret header for simplicity/security.
        const authHeader = req.headers.get("x-admin-secret");
        if (authHeader !== process.env.ADMIN_ACTION_SECRET) {
            return apiResponse.unauthorized();
        }

        // 2. Fetch Latest Changelog
        const changelog = await client.fetch(`*[_type == "changelog"] | order(date desc)[0]`);
        if (!changelog) {
            return apiResponse.notFound("No changelog found");
        }

        // 3. Fetch All Users
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) {
            throw usersError;
        }

        // 4. Send Emails
        const emailPromises = users.map(async (user) => {
            if (!user.email) return;

            const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Nex-T1 Update: ${changelog.title}</h1>
          <p><strong>Version:</strong> ${changelog.version}</p>
          <p><strong>Date:</strong> ${changelog.date}</p>
          <p>${changelog.description}</p>
          
          <h2>What's New</h2>
          <ul>
            ${changelog.changes.map((change: UntypedJson) => `
              <li>
                <strong>${change.type.toUpperCase()}:</strong> ${change.text}
              </li>
            `).join('')}
          </ul>
          
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/changelog" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Full Changelog
            </a>
          </p>
        </div>
      `;

            try {
                await sendEmailDigest({
                    to: user.email,
                    subject: `Nex-T1 Update: ${changelog.title}`,
                    html,
                });
            } catch (err) {
                logger.error(`Failed to send email to ${user.email}`, err);
            }
        });

        await Promise.all(emailPromises);

        return apiResponse.success({ success: true, count: users.length });
    } catch (error) {
        logger.error("Newsletter error:", error);
        return apiResponse.internalError("Internal Server Error");
    }
}
