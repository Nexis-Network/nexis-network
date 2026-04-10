import { logger } from '@/lib/logger';

export type ServerAnalyticsPayload = Record<string, UntypedJson> | undefined;

const LABEL = "[analytics:breadcrumb]";

function formatPayload(name: string, properties?: ServerAnalyticsPayload) {
  return {
    name,
    properties,
    timestamp: new Date().toISOString(),
    scope: "server",
  };
}

export function logAnalyticsBreadcrumb(name: string, properties?: ServerAnalyticsPayload) {
  try {
    logger.info(LABEL, formatPayload(name, properties));
  } catch (error) {
    logger.warn(`${LABEL} emit_failed`, { name, error });
  }
}
