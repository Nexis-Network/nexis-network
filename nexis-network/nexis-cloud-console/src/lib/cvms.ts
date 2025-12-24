export function normalizeCvmId(rawId: string) {
  const trimmed = rawId.trim();
  if (trimmed.startsWith("app_") || trimmed.startsWith("instance_")) {
    return trimmed;
  }

  if (/^[0-9a-f]{40}$/i.test(trimmed)) {
    return `app_${trimmed}`;
  }

  return trimmed;
}

export function formatMemory(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`;
  return `${value} MB`;
}

export function formatDisk(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value} GB`;
}

export function formatBytes(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

export function formatUptime(seconds: number | null | undefined) {
  if (!seconds && seconds !== 0) return "—";
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export type GatewayInfo = {
  host: string;
  port?: string;
};

export function parseGatewayDomain(gatewayDomain: string): GatewayInfo {
  const trimmed = gatewayDomain.trim();
  const lastColonIndex = trimmed.lastIndexOf(":");
  if (lastColonIndex > 0) {
    const potentialPort = trimmed.slice(lastColonIndex + 1);
    if (/^\d+$/.test(potentialPort)) {
      return {
        host: trimmed.slice(0, lastColonIndex),
        port: potentialPort,
      };
    }
  }
  return { host: trimmed };
}

export function buildSshHost(instanceId: string, gatewayDomain: string) {
  const gateway = parseGatewayDomain(gatewayDomain);
  const normalizedId = instanceId.startsWith("app_")
    ? instanceId.slice(4)
    : instanceId.startsWith("instance_")
      ? instanceId.slice(9)
      : instanceId;
  return {
    host: `${normalizedId}-22.${gateway.host}`,
    port: gateway.port ?? "443",
  };
}

export function buildSshCommand(instanceId: string, gatewayDomain: string) {
  const { host, port } = buildSshHost(instanceId, gatewayDomain);
  const proxyCommand = "openssl s_client -quiet -connect %h:%p 2>/dev/null";
  return {
    host,
    port,
    command: [
      "ssh",
      "-o",
      `ProxyCommand=${proxyCommand}`,
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      "-o",
      "LogLevel=ERROR",
      "-p",
      port,
      `root@${host}`,
    ].join(" "),
  };
}
