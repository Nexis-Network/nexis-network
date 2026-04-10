import { Badge } from "@/components/ui/badge";
import { ExternalLink, Globe } from "lucide-react";

export interface ResearchItem {
  title: string;
  url: string;
  description?: string;
  favicon?: string;
}

export interface ResearchArtifactData {
  query: string;
  items: ResearchItem[];
}

export function ResearchArtifact({ data }: { data: ResearchArtifactData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-foreground/80">
        <span>Researching</span>
        <Badge variant="outline" className="text-xs font-mono">{data.query}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.items.map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center p-3 rounded-lg border border-border/40 bg-card/30 hover:bg-white/5 hover:border-border/60 transition-all duration-200"
          >
            <div className="flex-shrink-0 mr-3 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              {item.favicon ? (
                <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.favicon} alt="" className="w-4 h-4 object-contain" />
                </>
              ) : (
                <Globe className="w-4 h-4 text-muted-foreground group-hover:text-sky-400 transition-colors" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                 <h4 className="text-sm font-medium text-foreground truncate max-w-[90%]">{item.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground truncate">{new URL(item.url).hostname}</p>
            </div>
            <ExternalLink className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
          </a>
        ))}
      </div>
    </div>
  );
}
