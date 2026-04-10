"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MCPRegistry } from "@/lib/mcp/registry";
import { getApiErrorMessage } from "@/lib/api-platform/payload";
import { logger } from "@/lib/logger";

import { McpCatalog } from "@/components/mcp/mcp-catalog";

import { parseMcpRegistryPayload } from "./mcp-catalog-modal.utils";

interface McpCatalogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function McpCatalogModal({ open, onOpenChange }: McpCatalogModalProps) {
  const [registry, setRegistry] = useState<MCPRegistry | null>(null);

  useEffect(() => {
    if (!open || registry) {
      return;
    }

    let cancelled = false;

    async function fetchRegistry() {
      try {
        const res = await fetch("/api/mcp/registry");
        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(getApiErrorMessage(payload, "Failed to load registry"));
        }

        const parsedRegistry = parseMcpRegistryPayload(payload);
        if (!parsedRegistry) {
          throw new Error("Received invalid MCP registry payload");
        }

        if (!cancelled) {
          setRegistry(parsedRegistry);
        }
      } catch (err) {
        if (!cancelled) {
          setRegistry(null);
        }
        logger.error("Failed to load registry", err);
      }
    }

    void fetchRegistry();

    return () => {
      cancelled = true;
    };
  }, [open, registry]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1280px,calc(100vw-2rem))] h-[min(920px,calc(100vh-2rem))] sm:!max-w-none p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/40 flex flex-col">
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-border/40 bg-muted/10">
          <DialogTitle>MCP Server Catalog</DialogTitle>
          <DialogDescription>Discover and enable Model Context Protocol servers to enhance your agent&apos;s capabilities.</DialogDescription>
        </DialogHeader>

        <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 pb-0">
            <div
              data-testid="mcp-custom-server-card"
              className="relative isolate flex h-[228px] w-[1520px] max-w-full flex-col items-start overflow-hidden rounded-[8px] border border-dashed border-[#2E2E2E] bg-[rgba(18,18,18,0.25)] p-0 shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
            >
              <div
                data-testid="mcp-custom-server-card-background"
                aria-hidden
                className="pointer-events-none absolute -inset-[63px] isolate z-0 flex flex-col items-start justify-center p-0 opacity-50"
              >
                <div className="relative h-[368px] w-[1646px] self-stretch">
                  <div className="absolute right-0 top-1/2 h-[586.58px] w-[1646px] -translate-y-1/2 bg-background dark:bg-black" />
                  <div
                    className="absolute inset-0 opacity-90"
                    style={{
                      backgroundImage: [
                        "repeating-linear-gradient(to right, transparent 0 263px, rgba(52,52,52,0.8) 263px 264.4px)",
                        "repeating-linear-gradient(to bottom, transparent 0 91px, rgba(52,52,52,0.8) 91px 92.4px)",
                        "linear-gradient(120deg, rgba(62,62,62,0.15) 20%, rgba(62,62,62,0.35) 55%, rgba(62,62,62,0.15) 85%)",
                      ].join(","),
                    }}
                  />
                </div>
              </div>

              <div
                data-testid="mcp-custom-server-card-gradient-overlay"
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,#0F0F0F_0%,rgba(15,15,15,0)_100%)]"
              />

              <div className="relative z-[2] flex h-[226px] w-[calc(100%-2px)] flex-row items-center justify-center gap-16 px-12">
                <div className="flex h-[132px] w-full flex-col items-start gap-3 p-0">
                  <h3 className="flex h-4 w-full items-center font-['Source_Code_Pro'] text-[12px] font-medium leading-[16px] tracking-[0.6px] text-[#B4B4B4] uppercase">
                    Add Custom MCP Server
                  </h3>
                  <p className="flex h-[48px] w-full items-center font-['Helvetica_Neue'] text-[15.5px] font-medium leading-[24px] text-[#FAFAFA]">
                    Deploy and integrate your own custom MCP server using E2B. Compatible with Node.js, Python, and Go to provide you a limitless on-chain experience.
                  </p>
                  <div className="flex h-[48px] w-[292px] flex-row items-center gap-3 p-0">
                    <a
                      href="https://github.com/e2b-dev/e2b-cookbook/tree/main/examples/mcp-custom-server-js"
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-[48px] w-[140px] items-center justify-center rounded-[9999px] bg-[#5E6AD2] px-4 text-[15.9px] font-medium leading-[48px] text-white transition-opacity hover:opacity-90"
                    >
                      Deploy server
                    </a>
                    <a
                      href="https://e2b.dev/docs"
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-[48px] w-[140px] items-center justify-center rounded-[9999px] bg-white px-4 text-[15.9px] font-medium leading-[48px] text-[#121212] transition-opacity hover:opacity-90"
                    >
                      Learn more
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <McpCatalog registry={registry} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
