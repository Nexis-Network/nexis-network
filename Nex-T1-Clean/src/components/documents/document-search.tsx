"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchDocumentChunks } from "@/lib/document-processor/actions";
import type { DocumentSearchMatch } from "@/lib/document-processor/actions";

interface SearchResult {
  matches: DocumentSearchMatch[];
  loading: boolean;
  error?: string;
}

interface DocumentSearchProps {
  documentId?: string;
  className?: string;
}

export function DocumentSearch({ documentId, className }: DocumentSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const [searchResult, setSearchResult] = useState<SearchResult>({
    matches: [],
    loading: false,
  });

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResult({ matches: [], loading: false });
      return;
    }

    const search = async () => {
      setSearchResult((prev) => ({ ...prev, loading: true }));
      try {
        const result = await searchDocumentChunks(debouncedQuery, documentId);
        if (result.success) {
          setSearchResult({
            matches: result.matches,
            loading: false,
          });
        } else {
          setSearchResult({
            matches: [],
            loading: false,
            error: result.error,
          });
        }
      } catch (error) {
        setSearchResult({
          matches: [],
          loading: false,
          error: error instanceof Error ? error.message : "Search failed",
        });
      }
    };

    search();
  }, [debouncedQuery, documentId]);

  return (
    <div className={className}>
      {/* Search Input */}
      <div className="-mt-12 relative mx-2">
        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="rounded-xl bg-white pr-4 pl-9"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search document content..."
          value={query}
        />
        {searchResult.loading && (
          <Loader2 className="absolute top-2.5 right-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {searchResult.error ? (
        <p className="mt-4 text-destructive text-sm">{searchResult.error}</p>
      ) : searchResult.matches.length > 0 ? (
        <ScrollArea className="mt-4 h-[400px] rounded-md border">
          <div className="space-y-4 p-4">
            {searchResult.matches.map((chunk) => (
              <Card className="space-y-2 p-4" key={chunk.id}>
                {/* Chunk Metadata */}
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  {!documentId && <span className="font-medium text-foreground">{chunk.title}</span>}
                  <div className="flex gap-2">
                    {chunk.heading && <Badge variant="outline">{chunk.heading}</Badge>}
                    {chunk.page_number && <Badge variant="outline">Page {chunk.page_number}</Badge>}
                  </div>
                </div>

                {/* Chunk Content */}
                <p className="text-sm">{chunk.content}</p>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : query && !searchResult.loading ? (
        <p className="mt-4 text-muted-foreground text-sm">No results found</p>
      ) : null}
    </div>
  );
}
