"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { ThemeProvider, useTheme } from "next-themes";
import { useMemo } from "react";

type ProvidersProps = {
  children: React.ReactNode;
};

type PrivyWrapperProps = {
  children: React.ReactNode;
};

function PrivyWrapper({ children }: PrivyWrapperProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;
  const { resolvedTheme } = useTheme();
  const theme: "light" | "dark" = resolvedTheme === "light" ? "light" : "dark";

  const config = useMemo<PrivyClientConfig>(
    () => ({
      appearance: {
        theme,
        accentColor: "#0EA5E9",
        walletList: [
          "metamask",
          "wallet_connect",
          "safe",
          "coinbase_wallet",
          "rainbow",
          "phantom",
        ],
      },
      loginMethods: ["passkey", "email", "google", "github", "wallet"],
      embeddedWallets: {
        ethereum: {
          createOnLogin: "users-without-wallets",
        },
      },
    }),
    [theme]
  );

  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider appId={appId} clientId={clientId} config={config}>
      {children}
    </PrivyProvider>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
      <PrivyWrapper>{children}</PrivyWrapper>
    </ThemeProvider>
  );
}
