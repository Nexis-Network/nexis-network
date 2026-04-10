import type { ReactNode } from "react";

import { AuthenticatedLayoutSuspense } from "./authenticated-layout-content";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  return <AuthenticatedLayoutSuspense>{children}</AuthenticatedLayoutSuspense>;
}
