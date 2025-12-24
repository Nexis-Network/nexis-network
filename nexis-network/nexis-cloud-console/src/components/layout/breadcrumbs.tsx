"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const labelMap: Record<string, string> = {
  dashboard: "Overview",
  instances: "Instances",
  deploy: "Deploy",
  agents: "Agents",
  keys: "API Keys",
  teams: "Teams",
  billing: "Billing",
  "trust-center": "Trust Center",
  settings: "Settings",
  login: "Login",
};

function formatSegment(segment: string) {
  if (labelMap[segment]) return labelMap[segment];
  if (segment.startsWith("app_")) return `${segment.slice(0, 7)}…${segment.slice(-4)}`;
  return segment.replace(/-/g, " ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    return {
      label: formatSegment(segment),
      href,
      isLast: index === segments.length - 1,
    };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center text-xs text-text-muted">
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center">
          {crumb.isLast ? (
            <span className="text-text-secondary">{crumb.label}</span>
          ) : (
            <Link className="hover:text-text-primary" href={crumb.href}>
              {crumb.label}
            </Link>
          )}
          {!crumb.isLast && <ChevronRight className="mx-2 h-3 w-3" />}
        </span>
      ))}
    </nav>
  );
}
