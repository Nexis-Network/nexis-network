import {
  Bot,
  CreditCard,
  Key,
  LayoutDashboard,
  Rocket,
  Server,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

export const dashboardNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/instances", label: "Instances", icon: Server },
  { href: "/dashboard/deploy", label: "Deploy", icon: Rocket },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/keys", label: "API Keys", icon: Key },
  { href: "/dashboard/teams", label: "Teams", icon: Users },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/trust-center", label: "Trust Center", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
