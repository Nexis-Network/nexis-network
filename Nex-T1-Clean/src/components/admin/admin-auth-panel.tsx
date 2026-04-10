"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAdminSession } from "@/components/admin/admin-session-provider";

interface AdminChallengeResponse {
  requires_enrollment: boolean;
  provisioning_uri?: string | null;
  secret?: string | null;
  pending: boolean;
  error?: string;
}

interface AdminVerifyResponse {
  token?: { access_token?: string; expires_at?: string };
  session_id?: string;
  error?: string;
}

export function AdminAuthPanel() {
  const router = useRouter();
  const { status, refresh } = useAdminSession();
  const [challenge, setChallenge] = useState<AdminChallengeResponse | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const authenticated = Boolean(status?.authenticated);

  const refreshStatus = useCallback(async () => {
    setError(null);
    try {
      const data = await refresh();
      if (!data?.authenticated) {
        setSuccessMessage(null);
      }
    } catch (error: UntypedJson) {
      const message = error instanceof Error ? error.message : "Failed to refresh admin status";
      setError(message);
    }
  }, [refresh]);

  const handleChallenge = useCallback(async () => {
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/admin/auth/challenge", { method: "POST" });
      const data = (await res.json()) as AdminChallengeResponse;
      setChallenge(data);
      if (data.error) {
        setError(data.error);
      }
    } catch (error: UntypedJson) {
      const message = error instanceof Error ? error.message : "Challenge request failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (!code) {
      setError("Enter your 6-digit TOTP code");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/admin/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as AdminVerifyResponse & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error || "Verification failed");
        return;
      }
      setSuccessMessage("Admin session verified");
      setCode("");
      setChallenge(null);
      await refreshStatus();
      router.refresh();
    } catch (error: UntypedJson) {
      const message = error instanceof Error ? error.message : "Verification failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [code, refreshStatus, router]);

  const handleLogout = useCallback(async () => {
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      await refreshStatus();
      router.refresh();
    } catch (error: UntypedJson) {
      const message = error instanceof Error ? error.message : "Logout failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [refreshStatus, router]);

  const enrollmentHint = useMemo(() => {
    if (!challenge) return null;
    if (!challenge.requires_enrollment) return null;
    if (!challenge.secret) return null;
    return `Add this secret to your authenticator: ${challenge.secret}`;
  }, [challenge]);

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-regular">Admin Access</h2>
        <p className="text-sm text-muted-foreground">
          Complete the admin 2FA flow to unlock the analytics dashboard and tooling. Access is limited to
          nex-t1.ai accounts with explicit admin privileges.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

      <div className="rounded-md bg-muted/40 p-4 text-sm">
        <p className="font-medium">Status</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>Authenticated: {authenticated ? "Yes" : "No"}</li>
          {status?.session_id ? <li>Session ID: {status.session_id}</li> : null}
          {status?.expires_at ? <li>Expires: {new Date(status.expires_at).toLocaleString()}</li> : null}
          {status?.last_verified_at ? <li>Last Verified: {new Date(status.last_verified_at).toLocaleString()}</li> : null}
        </ul>
      </div>

      {!authenticated ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleChallenge}
              disabled={busy}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {challenge?.requires_enrollment ? "Resend Enrollment" : "Start Enrollment"}
            </button>
            {challenge?.provisioning_uri ? (
              <p className="text-xs text-muted-foreground">
                Provisioning URI: <span className="break-all">{challenge.provisioning_uri}</span>
              </p>
            ) : null}
            {enrollmentHint ? <p className="text-xs font-mono text-muted-foreground">{enrollmentHint}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">TOTP Code</label>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))}
              placeholder="123456"
              maxLength={10}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={busy}
              className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Verify &amp; Sign In
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You have an active admin session. Launch the analytics modules or revoke access below.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Sign Out of Admin Session
          </button>
        </div>
      )}
    </div>
  );
}
