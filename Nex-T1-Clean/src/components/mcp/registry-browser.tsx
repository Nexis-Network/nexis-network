"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Server, Globe } from "lucide-react";
import { SubmitToolModal } from "./submit-tool-modal";


import { logger } from '@/lib/logger';
interface RegistryEntry {
  id: string;
  name: string;
  description: string | null;
  transport: 'sse' | 'stdio' | 'http';
  capabilities: string[];
  status: 'active' | 'maintenance' | 'deprecated';
  publisher: {
    name: string;
    verified: boolean;
  } | null;
}

export function RegistryBrowser() {
  const [tools, setTools] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  const supabase = createClient();

  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mcp_registry')
        .select(`
          id,
          name,
          description,
          transport,
          capabilities,
          status,
          publisher:mcp_publishers(name, verified)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTools(data);
    } catch (error) {
      logger.error("Error fetching tools:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTools();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('registry-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mcp_registry' },
        () => {
          fetchTools();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchTools]);

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase()) || 
                          tool.description?.toLowerCase().includes(search.toLowerCase()) ||
                          tool.publisher?.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter ? tool.capabilities?.includes(filter) : true;
    return matchesSearch && matchesFilter;
  });

  const allCapabilities = Array.from(new Set(tools.flatMap(t => t.capabilities || [])));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools, publishers..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SubmitToolModal onSuccess={() => fetchTools()} />
      </div>

      {allCapabilities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={filter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(null)}
            className="rounded-full"
          >
            All
          </Button>
          {allCapabilities.map(cap => (
            <Button
              key={cap}
              variant={filter === cap ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filter === cap ? null : cap)}
              className="rounded-full capitalize"
            >
              {cap}
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse bg-muted/50 h-48" />
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No tools found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <Card key={tool.id} className="group hover:border-sky-500/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {tool.name}
                      {tool.publisher?.verified && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-sky-500/10 text-sky-500">Verified</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      by {tool.publisher?.name || 'Unknown'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={`capitalize ${
                    tool.status === 'active' ? 'border-green-500/50 text-green-500' :
                    tool.status === 'maintenance' ? 'border-yellow-500/50 text-yellow-500' :
                    'border-red-500/50 text-red-500'
                  }`}>
                    {tool.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {tool.description || "No description provided."}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {tool.capabilities?.slice(0, 3).map(cap => (
                    <Badge key={cap} variant="secondary" className="text-xs capitalize">
                      {cap}
                    </Badge>
                  ))}
                  {(tool.capabilities?.length || 0) > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{tool.capabilities.length - 3} more
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground flex justify-between items-center border-t pt-4">
                <div className="flex items-center gap-2">
                  {tool.transport === 'sse' ? <Globe className="h-3 w-3" /> : <Server className="h-3 w-3" />}
                  <span className="uppercase">{tool.transport}</span>
                </div>
                {/* Future: Add 'Connect' or 'View Details' button */}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
