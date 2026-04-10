import type { Metadata } from "next";
import type { ReactNode } from "react";

const title = "Dashboard | Nex-T1 AI";
const description =
  "Explore Nex-T1's on-chain intelligence dashboard with live chat, portfolio insights, and automated Web3 agent controls.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/app",
  },
};

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <main className="min-h-screen w-full">{children}</main>;
}
