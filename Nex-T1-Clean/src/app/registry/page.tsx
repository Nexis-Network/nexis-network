"use client";

import { RegistryBrowser } from "@/components/mcp/registry-browser";
import { PublisherManagement } from "@/components/mcp/publisher-management";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Building2 } from "lucide-react";

// Skip static prerender — React SSR context unavailable during build

export default function RegistryPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-sky-500">MCP Registry</h1>
        <p className="text-muted-foreground">
          Discover, publish, and manage Model Context Protocol (MCP) servers.
        </p>
      </div>

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList className="bg-sky-500/10 p-1">
          <TabsTrigger value="browse" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            <Globe className="mr-2 h-4 w-4" />
            Browse Registry
          </TabsTrigger>
          <TabsTrigger value="publisher" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            <Building2 className="mr-2 h-4 w-4" />
            Publisher Portal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
            <RegistryBrowser />
        </TabsContent>

        <TabsContent value="publisher">
          <div className="max-w-2xl mx-auto">
            <PublisherManagement />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
