import { getCspNonce } from "@/lib/security/nonce";

export async function RequestScopedHead() {
  const nonce = await getCspNonce();

  return (
    <>
      <script
        nonce={nonce ?? undefined}
        dangerouslySetInnerHTML={{
          __html: `
            (() => {
              if (typeof window === "undefined") return;
              if (window.__nexProviderInjectionGuardInstalled) return;
              window.__nexProviderInjectionGuardInstalled = true;

              const matches = (message, filename) =>
                (typeof message === "string" && message.includes("Cannot redefine property: ethereum")) ||
                (typeof filename === "string" && filename.includes("evmAsk.js"));

              window.addEventListener(
                "error",
                (event) => {
                  if (!matches(event?.message, event?.filename)) return;
                  event.preventDefault();
                  event.stopImmediatePropagation();
                },
                true,
              );

              window.addEventListener(
                "unhandledrejection",
                (event) => {
                  const reason = event?.reason;
                  const message =
                    reason && typeof reason.message === "string"
                      ? reason.message
                      : String(reason ?? "");
                  if (!matches(message, "")) return;
                  event.preventDefault();
                },
                true,
              );
            })();
          `,
        }}
      />
      {nonce ? <meta name="csp-nonce" content={nonce} /> : null}
    </>
  );
}
