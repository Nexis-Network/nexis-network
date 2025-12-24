"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Footer } from "@/components/layout/footer";
import {
  useLoginWithEmail,
  useLoginWithOAuth,
  useLoginWithPasskey,
  usePrivy,
  useSignupWithPasskey,
} from "@privy-io/react-auth";
import { getCsrfToken } from "@/lib/csrf";
import { Loader2 } from "lucide-react";
import Image from "next/image";

type SessionPayload = {
  authMethod?: "privy" | "api-key";
  hasApiKey?: boolean;
};

function resolveErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const passkeyEnabled = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  const { ready, authenticated, getAccessToken, login } = usePrivy();

  const [redirectTo, setRedirectTo] = useState("/dashboard");
  const [linkRequested, setLinkRequested] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);

  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [csrfError, setCsrfError] = useState<string | null>(null);

  const [privyStatus, setPrivyStatus] = useState<string | null>(null);
  const [privyError, setPrivyError] = useState<string | null>(null);
  const [privyLoading, setPrivyLoading] = useState(false);
  const [privySessionReady, setPrivySessionReady] = useState(false);

  const [emailAddress, setEmailAddress] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  const [oauthError, setOauthError] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeyLinked, setApiKeyLinked] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<string | null>(null);

  const privySyncRef = useRef(false);

  const resolveCsrfToken = useCallback(async () => {
    if (csrfToken) return csrfToken;
    try {
      const token = await getCsrfToken();
      setCsrfToken(token);
      return token;
    } catch (error) {
      const message = resolveErrorMessage(error, "Unable to initialize CSRF protection.");
      setCsrfError(message);
      throw new Error(message);
    }
  }, [csrfToken]);

  const syncPrivySession = useCallback(async () => {
    if (!passkeyEnabled) {
      setPrivyError("Privy login is not enabled.");
      return;
    }
    if (!ready) {
      setPrivyError("Passkey is still initializing.");
      return;
    }

    if (privySyncRef.current) return;

    privySyncRef.current = true;
    setPrivyLoading(true);
    setPrivyError(null);
    setPrivyStatus("Verifying session...");

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("No access token returned by Privy.");
      }

      const csrf = await resolveCsrfToken();
      const response = await fetch("/api/auth/privy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || "Privy session failed.");
      }

      setPrivySessionReady(true);
      setPrivyStatus("Session verified. Link your API key to manage CVMs.");
    } catch (error) {
      setPrivyError(resolveErrorMessage(error, "Privy sign-in failed."));
      setPrivyStatus(null);
    } finally {
      setPrivyLoading(false);
      privySyncRef.current = false;
    }
  }, [getAccessToken, passkeyEnabled, ready, resolveCsrfToken]);

  const { loginWithPasskey } = useLoginWithPasskey({
    onComplete: syncPrivySession,
    onError: (error) => setPrivyError(resolveErrorMessage(error, "Passkey login failed.")),
  });

  const { signupWithPasskey } = useSignupWithPasskey({
    onComplete: syncPrivySession,
    onError: (error) => setPrivyError(resolveErrorMessage(error, "Passkey signup failed.")),
  });

  const { sendCode, loginWithCode, state: emailState } = useLoginWithEmail({
    onComplete: syncPrivySession,
    onError: (error) => setEmailError(resolveErrorMessage(error, "Email login failed.")),
  });

  const { initOAuth, loading: oauthLoading } = useLoginWithOAuth({
    onComplete: syncPrivySession,
    onError: (error) => setOauthError(resolveErrorMessage(error, "OAuth login failed.")),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get("redirect");
    if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
      setRedirectTo(redirectParam);
    }
    setLinkRequested(params.get("link") === "api-key");
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (response.ok && isMounted) {
          const payload = (await response.json()) as SessionPayload;
          const hasPasskeySession = payload.authMethod === "privy";
          if (!linkRequested) {
            router.replace(redirectTo);
            return;
          }
          if (hasPasskeySession) {
            setPrivySessionReady(true);
            setApiKeyLinked(Boolean(payload.hasApiKey));
          }
        }
      } catch {
        // Ignore session check errors.
      } finally {
        if (isMounted) setSessionChecking(false);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [linkRequested, redirectTo, router]);

  useEffect(() => {
    if (!passkeyEnabled) return;
    if (!ready || !authenticated || privySessionReady) return;
    syncPrivySession();
  }, [authenticated, passkeyEnabled, privySessionReady, ready, syncPrivySession]);

  useEffect(() => {
    resolveCsrfToken().catch(() => undefined);
  }, [resolveCsrfToken]);

  const handleLinkApiKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiKeyLoading(true);
    setApiKeyError(null);
    setApiKeyStatus(null);

    try {
      const csrf = await resolveCsrfToken();
      const response = await fetch("/api/auth/api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setApiKeyError(payload?.error || "Invalid API key");
        return;
      }

      setApiKeyLinked(true);
      setApiKeyStatus("API key linked. You can now manage CVMs.");
    } catch (error) {
      setApiKeyError(resolveErrorMessage(error, "Failed to link API key."));
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleContinue = () => {
    router.replace(redirectTo);
  };

  const handleSendEmailCode = async () => {
    setEmailSending(true);
    setEmailError(null);
    setEmailStatus(null);
    try {
      const email = emailAddress.trim();
      if (!email) {
        setEmailError("Enter an email address to continue.");
        return;
      }
      await sendCode({ email });
      setEmailStatus("Verification code sent.");
    } catch (error) {
      setEmailError(resolveErrorMessage(error, "Failed to send email code."));
    } finally {
      setEmailSending(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    setEmailVerifying(true);
    setEmailError(null);
    setEmailStatus(null);
    try {
      const code = emailCode.trim();
      if (!code) {
        setEmailError("Enter the verification code.");
        return;
      }
      await loginWithCode({ code });
      setEmailStatus("Email verified. Finalizing session...");
    } catch (error) {
      setEmailError(resolveErrorMessage(error, "Failed to verify email code."));
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    setOauthError(null);
    try {
      await initOAuth({ provider });
    } catch (error) {
      setOauthError(resolveErrorMessage(error, `Failed to start ${provider} login.`));
    }
  };

  const handleWalletLogin = () => {
    login({ loginMethods: ["wallet"] });
  };

  if (sessionChecking) {
    return (
      <div className="min-h-screen bg-background-page flex items-center justify-center text-text-secondary">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Checking session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-page text-text-primary flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-10">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
                <Image src="/logo.svg" alt="Nexis" width={40} height={40} className="w-10 h-10" />
            </Link>
            <h1 className="text-3xl font-medium tracking-tight mt-4 text-white">
                Log in to Nexis
            </h1>
            <p className="text-text-secondary text-sm">
                Secure enterprise-grade access for your confidential workloads.
            </p>
        </div>

        {/* Auth Container */}
        <div className="w-full space-y-6">
            {!privySessionReady ? (
                <>
                {/* Passkey (Primary) */}
                {passkeyEnabled && (
                    <div className="space-y-3">
                        <Button
                            size="lg"
                            className="w-full bg-white text-black hover:bg-neutral-200 font-medium h-12 rounded-lg"
                            onClick={() => loginWithPasskey()}
                            isLoading={privyLoading}
                            disabled={!ready || privyLoading}
                        >
                            Sign in with passkey
                        </Button>
                        <div className="text-center">
                            <button 
                                onClick={() => signupWithPasskey()} 
                                disabled={!ready || privyLoading}
                                className="text-xs text-text-muted hover:text-text-primary transition-colors"
                            >
                                First time? Create a passkey
                            </button>
                        </div>
                         {privyStatus && <div className="text-xs text-text-secondary text-center">{privyStatus}</div>}
                         {privyError && <div className="text-xs text-red-500 text-center">{privyError}</div>}
                         {csrfError && <div className="text-xs text-red-500 text-center">{csrfError}</div>}
                    </div>
                )}

                {/* Divider */}
                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border-default"></span></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background-page px-2 text-text-muted">Or continue with</span></div>
                </div>

                {/* Other Methods */}
                <div className="space-y-4">
                    {/* Socials */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="secondary"
                            className="w-full bg-[#1A1A1A] border-[#333] hover:bg-[#252525] text-white"
                            onClick={() => handleOAuthLogin("google")}
                            disabled={oauthLoading}
                            isLoading={oauthLoading}
                        >
                            Google
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full bg-[#1A1A1A] border-[#333] hover:bg-[#252525] text-white"
                            onClick={() => handleOAuthLogin("github")}
                            disabled={oauthLoading}
                            isLoading={oauthLoading}
                        >
                            GitHub
                        </Button>
                    </div>
                    {oauthError && <div className="text-xs text-red-500">{oauthError}</div>}

                    {/* Email */}
                    <div className="space-y-2">
                         {emailState?.status === "awaiting-code-input" ? (
                            <div className="flex gap-2">
                                <label htmlFor="login-email-code" className="sr-only">
                                    Verification code
                                </label>
                                <Input 
                                    id="login-email-code"
                                    placeholder="Code" 
                                    className="bg-[#0A0A0A] border-[#333] text-white h-10"
                                    value={emailCode}
                                    onChange={(e) => setEmailCode(e.target.value)}
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                />
                                 <Button onClick={handleVerifyEmailCode} isLoading={emailVerifying} className="bg-white text-black hover:bg-neutral-200">
                                    Verify
                                </Button>
                            </div>
                         ) : (
                             <div className="flex gap-2">
                                <label htmlFor="login-email" className="sr-only">
                                    Work email
                                </label>
                                <Input 
                                    id="login-email"
                                    type="email" 
                                    placeholder="name@work-email.com" 
                                    className="bg-[#0A0A0A] border-[#333] text-white h-10"
                                    value={emailAddress}
                                    onChange={(e) => setEmailAddress(e.target.value)}
                                    autoComplete="email"
                                />
                                <Button onClick={handleSendEmailCode} isLoading={emailSending} variant="secondary" className="bg-[#1A1A1A] border-[#333] text-white hover:bg-[#252525]">
                                    Continue
                                </Button>
                             </div>
                         )}
                         {emailStatus && <div className="text-xs text-text-secondary">{emailStatus}</div>}
                         {emailError && <div className="text-xs text-red-500">{emailError}</div>}
                    </div>

                     {/* Wallet */}
                    <Button variant="ghost" className="w-full text-text-muted hover:text-white" onClick={handleWalletLogin}>
                        Connect Wallet
                    </Button>
                </div>
                </>
            ) : (
                /* API Key Linking State */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="p-4 rounded-lg bg-[#0A0A0A] border border-[#333] space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium text-white">Link API Key</h3>
                            <p className="text-sm text-text-secondary">
                                To manage CVMs, please link your Nexis Cloud API key.
                            </p>
                        </div>
                        <form onSubmit={handleLinkApiKey} className="space-y-4">
                             <label htmlFor="login-api-key" className="sr-only">
                                Nexis Cloud API key
                             </label>
                             <Input 
                                id="login-api-key"
                                type="password" 
                                placeholder="sk-..." 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="bg-black border-[#333] text-white"
                                autoComplete="off"
                             />
                              {apiKeyError && <div className="text-xs text-red-500">{apiKeyError}</div>}
                              {apiKeyStatus && <div className="text-xs text-green-500">{apiKeyStatus}</div>}
                             <div className="flex gap-3">
                                <Button type="submit" isLoading={apiKeyLoading} className="flex-1 bg-white text-black hover:bg-neutral-200">
                                    Link Key
                                </Button>
                                <Button type="button" variant="ghost" onClick={handleContinue} className="text-text-secondary hover:text-white">
                                    {apiKeyLinked ? "Continue" : "Skip"}
                                </Button>
                             </div>
                        </form>
                     </div>
                </div>
            )}
        </div>

      </div>
      <Footer />
    </div>
  );
}
