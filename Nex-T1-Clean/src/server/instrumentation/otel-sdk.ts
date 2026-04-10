import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";

import { logger } from "@/lib/logger";
export function initBetterStackOtel() {
  const BETTERSTACK_SOURCE_TOKEN = process.env.BETTERSTACK_SOURCE_TOKEN;
  const BETTERSTACK_INGEST_HOST = process.env.BETTERSTACK_INGEST_HOST;

  if (!BETTERSTACK_SOURCE_TOKEN || !BETTERSTACK_INGEST_HOST) {
    logger.warn(
      "Better Stack OTel credentials missing. Skipping OTel initialization.",
    );
    return;
  }

  const sdk = new NodeSDK({
    serviceName: "nex-t1-enterprise",
    traceExporter: new OTLPTraceExporter({
      url: `https://${BETTERSTACK_INGEST_HOST}/v1/traces`,
      headers: {
        Authorization: `Bearer ${BETTERSTACK_SOURCE_TOKEN}`,
      },
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `https://${BETTERSTACK_INGEST_HOST}/v1/metrics`,
        headers: {
          Authorization: `Bearer ${BETTERSTACK_SOURCE_TOKEN}`,
        },
      }),
    }),
    logRecordProcessor: new SimpleLogRecordProcessor(
      new OTLPLogExporter({
        url: `https://${BETTERSTACK_INGEST_HOST}/v1/logs`,
        headers: {
          Authorization: `Bearer ${BETTERSTACK_SOURCE_TOKEN}`,
        },
      }),
    ),
  });

  try {
    sdk.start();
    logger.debug("Better Stack OpenTelemetry initialized successfully.");

    // Graceful shutdown
    process.on("SIGTERM", () => {
      sdk
        .shutdown()
        .then(() => logger.debug("OTel SDK terminated"))
        .catch((error) => logger.debug("Error terminating OTel SDK", error))
        .finally(() => process.exit(0));
    });
  } catch (error) {
    logger.error("Failed to initialize Better Stack OpenTelemetry:", error);
  }
}
