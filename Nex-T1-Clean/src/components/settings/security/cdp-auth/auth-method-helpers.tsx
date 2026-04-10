import { Link2, Mail, Phone, Globe } from "lucide-react";
import type { LinkedAuthMethod } from "@/lib/hooks/cdp/use-cdp-auth-linking";

export function getMethodIcon(type: LinkedAuthMethod["type"]) {
  switch (type) {
    case "email":
      return <Mail className="h-4 w-4 text-blue-400" />;
    case "sms":
      return <Phone className="h-4 w-4 text-green-400" />;
    case "google":
    case "apple":
    case "x":
    case "github":
    case "discord":
      return <Globe className="h-4 w-4 text-purple-400" />;
    default:
      return <Link2 className="h-4 w-4 text-[var(--bento-text-muted)]" />;
  }
}

export function getMethodLabel(type: LinkedAuthMethod["type"]): string {
  switch (type) {
    case "email":
      return "Email";
    case "sms":
      return "Phone";
    case "wallet":
      return "Wallet";
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    case "x":
      return "X (Twitter)";
    case "github":
      return "GitHub";
    case "discord":
      return "Discord";
    default:
      return "Unknown";
  }
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
