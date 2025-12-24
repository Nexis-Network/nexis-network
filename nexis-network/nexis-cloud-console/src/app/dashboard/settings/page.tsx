"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCsrfToken } from "@/lib/csrf";

type CustomMetadata = {
  display_name?: string;
  avatar_url?: string;
};

function resolveErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

export default function SettingsPage() {
  const {
    ready,
    authenticated,
    user,
    linkEmail,
    updateEmail,
    linkGoogle,
    linkGithub,
    linkWallet,
    linkPasskey,
  } = usePrivy();

  const [metadata, setMetadata] = useState<CustomMetadata>({});
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const response = await fetch("/api/profile", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || "Unable to load profile.");
      }
      const payload = (await response.json()) as { customMetadata?: CustomMetadata };
      const nextMetadata = payload.customMetadata ?? {};
      setMetadata(nextMetadata);
      setDisplayName(nextMetadata.display_name ?? "");
      setAvatarUrl(nextMetadata.avatar_url ?? "");
    } catch (error) {
      setProfileError(resolveErrorMessage(error, "Unable to load profile."));
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    refreshProfile();
  }, [authenticated, ready, refreshProfile]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    setProfileStatus(null);
    try {
      const csrf = await getCsrfToken();
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          avatarUrl: avatarUrl.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || "Failed to update profile.");
      }

      const payload = (await response.json()) as { customMetadata?: CustomMetadata };
      const nextMetadata = payload.customMetadata ?? {};
      setMetadata(nextMetadata);
      setDisplayName(nextMetadata.display_name ?? "");
      setAvatarUrl(nextMetadata.avatar_url ?? "");
      setProfileStatus("Profile updated.");
    } catch (error) {
      setProfileError(resolveErrorMessage(error, "Failed to update profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const emailLabel = user?.email?.address || "Not linked";
  const googleLinked = Boolean(user?.google);
  const githubLinked = Boolean(user?.github);
  const walletLinked = Boolean(user?.wallet);
  const passkeyLinked = user?.linkedAccounts?.some((account) => account.type === "passkey");

  const profileSummary = useMemo(() => {
    if (metadata.display_name) return metadata.display_name;
    if (user?.email?.address) return user.email.address;
    if (user?.wallet?.address) return `Wallet ${user.wallet.address.slice(0, 6)}…`;
    return "Nexis Console User";
  }, [metadata.display_name, user?.email?.address, user?.wallet?.address]);

  if (!ready) {
    return <div className="text-text-secondary">Loading account...</div>;
  }

  if (!authenticated) {
    return <div className="text-text-secondary">Sign in to manage your profile.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your login methods and profile metadata.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-background-surface border border-border-default overflow-hidden">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile avatar"
                  className="h-full w-full object-cover"
                  width={48}
                  height={48}
                  unoptimized
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-text-muted">
                  {profileSummary.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-text-muted">Display name</div>
              <div className="text-lg text-white">{profileSummary}</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-text-secondary">Display name</label>
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                disabled={loadingProfile}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-text-secondary">Avatar URL</label>
              <Input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
                disabled={loadingProfile}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSaveProfile} isLoading={savingProfile}>
              Save profile
            </Button>
            <Button type="button" variant="secondary" onClick={refreshProfile}>
              Refresh
            </Button>
          </div>
          {profileStatus && <div className="text-sm text-text-secondary">{profileStatus}</div>}
          {profileError && <div className="text-sm text-red-400">{profileError}</div>}
          {loadingProfile && <div className="text-xs text-text-muted">Loading profile metadata...</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-text-secondary">Email</div>
              <div className="text-sm text-text-primary">{emailLabel}</div>
              <div className="flex flex-wrap gap-2">
                {user?.email ? (
                  <Button type="button" variant="secondary" onClick={updateEmail}>
                    Update email
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={linkEmail}>
                    Link email
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-text-secondary">Wallet</div>
              <div className="text-sm text-text-primary">
                {walletLinked ? user?.wallet?.address : "Not linked"}
              </div>
              <Button type="button" variant="secondary" onClick={linkWallet}>
                {walletLinked ? "Link another wallet" : "Connect wallet"}
              </Button>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-text-secondary">Google</div>
              <div className="text-sm text-text-primary">{googleLinked ? "Linked" : "Not linked"}</div>
              <Button type="button" variant="secondary" onClick={linkGoogle} disabled={googleLinked}>
                {googleLinked ? "Google linked" : "Link Google"}
              </Button>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-text-secondary">GitHub</div>
              <div className="text-sm text-text-primary">{githubLinked ? "Linked" : "Not linked"}</div>
              <Button type="button" variant="secondary" onClick={linkGithub} disabled={githubLinked}>
                {githubLinked ? "GitHub linked" : "Link GitHub"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-text-secondary">Passkeys</div>
            <div className="text-sm text-text-primary">
              {passkeyLinked ? "Passkey linked" : "No passkey linked"}
            </div>
            <Button type="button" variant="secondary" onClick={linkPasskey}>
              Add passkey
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
