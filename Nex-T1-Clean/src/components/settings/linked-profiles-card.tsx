"use client";

/**
 * Domain: auth
 * Responsibility: Show linked sign-in methods UI placeholder.
 * Depends on: UI components only.
 *
 * @deprecated This component is deprecated as of 2026-02-24.
 *
 * DEPRECATION NOTICE:
 * All four OAuth providers (Google, Discord, GitHub, Twitter/X) were previously
 * handled via the legacy embedded-wallet linking flow, which has been fully
 * removed from the platform. The component is preserved in the codebase solely for:
 *   1. Reference when implementing Supabase-native OAuth profile linking
 *   2. Audit trail showing the feature existed and was intentionally disabled
 *
 * This component is NOT rendered in production. The parent page
 * (connections-page-client.tsx) explicitly excludes it with a comment.
 *
 * MIGRATION PATH:
 * When Supabase-native OAuth linking is implemented, this component should be
 * replaced with a new implementation that uses:
 *   - supabase.auth.linkIdentity() for OAuth provider linking
 *   - supabase.auth.getUserIdentities() for listing linked providers
 *   - Proper unlinking via supabase.auth.unlinkIdentity()
 *
 * See: https://supabase.com/docs/guides/auth/auth-identity-linking
 */

import { AlertTriangle, Link as LinkIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BentoCard } from "@/components/settings/shared/bento-card";

/**
 * @deprecated Use future Supabase-native OAuth linking component instead.
 * This component renders a deprecation notice only. All OAuth linking
 * functionality was removed during the managed-wallet migration.
 */
export function LinkedProfilesCard() {
  return (
    <BentoCard className="opacity-60">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[var(--bento-text-muted)]">
          <LinkIcon className="h-5 w-5" />
          <h3 className="text-sm font-medium">Linked Profiles</h3>
        </div>
        <p className="text-xs text-[var(--bento-text-muted)]">
          OAuth profile linking (Google, Discord, GitHub, Twitter/X).
        </p>
      </div>

      <Alert variant="destructive" className="mt-4 border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-500">Feature Deprecated</AlertTitle>
        <AlertDescription className="text-[var(--bento-text-muted)]">
          OAuth profile linking was removed during the managed-wallet migration.
          This feature is planned for re-implementation using Supabase-native
          identity linking in a future release.
        </AlertDescription>
      </Alert>
    </BentoCard>
  );
}
