const GOOGLE_IDENTITY_SRC = "https://accounts.google.com/gsi/client";

let loadPromise: Promise<void> | null = null;

function getOAuthNamespace() {
  if (typeof window === "undefined") {
    return undefined;
  }
  const googleGlobal = (window as typeof window & { google?: UntypedJson }).google;
  return googleGlobal?.accounts?.oauth2;
}

export async function ensureGoogleIdentityLoaded() {
  if (getOAuthNamespace()) {
    return;
  }

  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Google Identity Services are only available in the browser"));
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SRC}"]`);
      if (existingScript && existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      const script = existingScript ?? document.createElement("script");
      script.src = GOOGLE_IDENTITY_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.loaded = "false";

      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };

      script.onerror = () => {
        script.remove();
        reject(new Error("Failed to load Google Identity Services"));
      };

      if (!existingScript) {
        document.head.appendChild(script);
      }
    });
  }

  return loadPromise;
}

export type GoogleAuthorizationCodeResult = {
  code: string;
  scope?: string;
};

export async function requestGoogleAuthorizationCode(clientId: string, scope = "openid email profile") {
  if (!clientId) {
    throw new Error("Google OAuth client ID is not configured");
  }

  await ensureGoogleIdentityLoaded();

  const oauth2 = getOAuthNamespace();
  if (!oauth2 || typeof oauth2.initCodeClient !== "function") {
    throw new Error("Google OAuth client is unavailable");
  }

  return new Promise<GoogleAuthorizationCodeResult>((resolve, reject) => {
    try {
      const client = oauth2.initCodeClient({
        client_id: clientId,
        scope,
        ux_mode: "popup",
        redirect_uri: "postmessage",
        callback(response: { code?: string; scope?: string; error?: string; error_description?: string }) {
          if (response.error || !response.code) {
            const errorMessage = response.error_description || response.error || "Google authorization failed";
            reject(new Error(errorMessage));
            return;
          }
          resolve({
            code: response.code,
            scope: response.scope,
          });
        },
        error_callback(error: UntypedJson) {
          const message = typeof (error as { type?: string })?.type === "string" ? (error as { type?: string }).type : "Google authorization interrupted";
          reject(new Error(message));
        },
      });

      client.requestCode();
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Google authorization failed"));
    }
  });
}

// No global augmentations needed; keep module scoped helpers only.
