"use client";

import Login from "@/components/auth/new-login";

type LoginWithWalletProps = React.ComponentProps<typeof Login>;

export function LoginWithWallet(props: LoginWithWalletProps) {
  return <Login {...props} />;
}
