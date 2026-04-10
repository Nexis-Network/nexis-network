"use client";

import { motion } from "framer-motion";
import { 
  IconArrowLeft, 
  IconBrandDocker, 
  IconBrandGithub, 
  IconWorld, 
  IconTerminal2, 
  IconCopy,
  IconCheck
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MCPServer } from "@/lib/mcp/registry";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


import { logger } from '@/lib/logger';
interface McpDetailViewProps {
  server: MCPServer;
}

export function McpDetailView({ server }: McpDetailViewProps) {
  const [copiedEnv, setCopiedEnv] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check installation status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/mcp/installations");
        if (res.ok) {
          const data = await res.json();
          const installed = data.installations.some((i: UntypedJson) => i.server_name === server.name);
          setIsInstalled(installed);
        }
      } catch (e) {
        logger.error("Failed to check installation status", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkStatus();
  }, [server.name]);

  const handleToggleInstall = async () => {
    setIsLoading(true);
    try {
      if (isInstalled) {
        // Uninstall
        const res = await fetch(`/api/mcp/installations?serverName=${server.name}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setIsInstalled(false);
          toast.success("Server uninstalled");
        } else {
          toast.error("Failed to uninstall server");
        }
      } else {
        // Install
        const res = await fetch("/api/mcp/installations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverName: server.name }),
        });
        if (res.ok) {
          setIsInstalled(true);
          toast.success("Server installed successfully");
        } else {
          toast.error("Failed to install server");
        }
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEnv(label);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedEnv(null), 2000);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "docker": return <IconBrandDocker className="h-5 w-5" />;
      case "git": return <IconBrandGithub className="h-5 w-5" />;
      case "http": return <IconWorld className="h-5 w-5" />;
      case "npm": return <IconTerminal2 className="h-5 w-5 text-red-500" />;
      default: return <IconTerminal2 className="h-5 w-5" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="space-y-4">
        <Link 
          href="/mcp" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 group"
        >
          <IconArrowLeft className="mr-1 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Catalog
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
              {server.logoUrl ? (
                <Image
                  src={server.logoUrl}
                  alt={server.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                getSourceIcon(server.source.type)
              )}
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">{server.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground">{server.vendor}</span>
                <span>•</span>
                <span className="capitalize flex items-center gap-1">
                  {getSourceIcon(server.source.type)}
                  {server.source.type}
                </span>
                <span>•</span>
                <span>v1.0.0</span>
              </div>
            </div>
          </div>
          
          <Button 
            size="lg" 
            className={cn(
                "shrink-0 shadow-lg transition-all min-w-[140px]",
                isInstalled 
                    ? "bg-[#8eb94f]/10 text-emerald-600 hover:bg-[#8eb94f]/20 border-emerald-500/20 hover:border-emerald-500/30 shadow-emerald-500/10" 
                    : "bg-primary/90 hover:bg-primary shadow-primary/20"
            )}
            onClick={handleToggleInstall}
            disabled={isLoading}
            variant={isInstalled ? "outline" : "default"}
          >
            {isLoading ? (
                <span className="animate-pulse">Processing...</span>
            ) : isInstalled ? (
                <>
                    <IconCheck className="w-4 h-4 mr-2" />
                    Installed
                </>
            ) : (
                "Install / Enable"
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">About</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {server.description}
            </p>
            {server.tags && (
              <div className="flex flex-wrap gap-2">
                {server.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="px-2 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Configuration</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Environment Variables</CardTitle>
                <CardDescription>Required configuration for this server</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {server.env ? (
                  Object.entries(server.env).map(([key, config]) => (
                    <div key={key} className="group flex items-start justify-between gap-4 p-3 rounded-md bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="font-mono text-sm font-semibold text-primary">{key}</div>
                        {config.description && (
                          <div className="text-xs text-muted-foreground">{config.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {config.required && (
                          <Badge variant="outline" className="text-[10px] h-5 border-destructive/40 text-destructive">Required</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => copyToClipboard(key, key)}
                        >
                          {copiedEnv === key ? <IconCheck className="h-3 w-3" /> : <IconCopy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground italic">No environment variables required.</div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Installation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Source Location</label>
                <div className="p-2 bg-muted rounded border border-border font-mono text-xs break-all">
                  {server.source.location}
                </div>
              </div>
              
              {server.source.command && (
                <div className="space-y-2">
                  <label className="text-xs font-medium">Run Command</label>
                  <div className="p-2 bg-muted rounded border border-border font-mono text-xs break-all">
                    {server.source.command}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-primary/5 to-transparent border-primary/10">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-primary">Need Help?</h3>
              <p className="text-xs text-muted-foreground">
                Check the official usage guide for integrating this MCP server with your agents.
              </p>
              <Button variant="outline" size="sm" className="w-full text-xs">
                View Documentation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
