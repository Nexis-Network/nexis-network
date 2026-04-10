"use client";

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactContent,
  ArtifactActions,
} from "@/components/ai-elements/artifact";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Activity,
  Twitter,
  Globe,
  Send,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PumpFunArtifactData } from "@/modules/ai/artifacts/pumpfun";
import { MoralisPriceChart } from "@/components/moralis/moralis-price-chart";
import type { ReactNode, ComponentType } from "react";

function formatChange(value?: number, unit?: string) {
  if (value == null || Number.isNaN(value)) return null;
  const sign = value > 0 ? "+" : "";
  const formatted = `${sign}${value.toFixed(2)}${unit ?? "%"}`;
  return (
    <span
      className={cn(
        "text-xs font-medium",
        value >= 0 ? "text-[#8eb94f]" : "text-destructive",
      )}
    >
      {formatted}
    </span>
  );
}

export function PumpFunArtifact({ data }: { data: PumpFunArtifactData }) {
  // Common container with premium styling using Artifact shell
  const Container = ({
    children,
    title,
    icon: Icon,
    gradientFrom = "from-pink-500",
    gradientTo = "to-purple-500",
  }: {
    children: ReactNode;
    title: string;
    icon?: ComponentType<{ className?: string }>;
    gradientFrom?: string;
    gradientTo?: string;
  }) => (
    <Artifact className="space-y-0">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-4" />}
          <ArtifactTitle>{title}</ArtifactTitle>
        </div>
        <ArtifactActions>
          <Badge
            variant="outline"
            className="text-[10px] uppercase tracking-wider bg-background/50"
          >
            Pump.fun
          </Badge>
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="space-y-4">
        <div
          className={cn(
            "h-0.5 w-full bg-gradient-to-r opacity-80 mb-4 rounded-full",
            gradientFrom,
            gradientTo,
          )}
        />
        {children}
      </ArtifactContent>
    </Artifact>
  );

  switch (data.view) {
    case "trade": {
      return (
        <Container
          title={data.headline || "Trade Execution"}
          icon={Rocket}
          gradientFrom={
            data.action.success ? "from-emerald-500" : "from-destructive"
          }
          gradientTo={data.action.success ? "to-teal-500" : "to-orange-500"}
        >
          <div className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-border/40">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Command
              </p>
              <p className="font-medium text-sm text-foreground">
                {data.action.command}
              </p>
            </div>
            <Badge
              variant={data.action.success ? "default" : "destructive"}
              className={cn(
                "uppercase text-[10px] tracking-wider",
                data.action.success ? "bg-[#8eb94f] hover:bg-emerald-600" : "",
              )}
            >
              {data.action.success ? "Success" : "Failed"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-background/30 border border-border/30">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Mint
              </p>
              <p className="font-mono text-xs break-all">{data.action.mint}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/30 border border-border/30">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Cluster
              </p>
              <p className="font-medium text-xs">{data.action.cluster}</p>
            </div>
            {data.action.signature && (
              <div className="p-3 rounded-lg bg-background/30 border border-border/30 md:col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  Signature
                </p>
                <p className="font-mono text-xs break-all text-muted-foreground">
                  {data.action.signature}
                </p>
              </div>
            )}
          </div>

          {data.action.explorerUrl && (
            <a
              href={data.action.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium hover:bg-sky-500/20 transition-colors"
            >
              View on Explorer <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {data.action.error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs uppercase mb-1">Error</p>
                <p>{data.action.error}</p>
              </div>
            </div>
          )}
        </Container>
      );
    }

    case "coin_analysis": {
      return (
        <Container
          title={data.headline || "Token Analysis"}
          icon={Activity}
          gradientFrom="from-sky-500"
          gradientTo="to-indigo-500"
        >
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 rounded-xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/20">
            <div className="flex items-center gap-3">
              {/* Fallback avatar if no image, using first 2 chars */}
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-sky-500 text-white font-bold">
                  {data.overview.symbol.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold text-foreground leading-none">
                  {data.overview.name}
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  ${data.overview.symbol}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {data.overview.website && (
                <Badge
                  variant="outline"
                  className="h-6 px-2 gap-1 hover:bg-sky-500/10 cursor-pointer transition-colors border-sky-500/20 text-sky-600 dark:text-sky-400"
                >
                  <Globe className="h-3 w-3" /> Site
                </Badge>
              )}
              {data.overview.twitter && (
                <Badge
                  variant="outline"
                  className="h-6 px-2 gap-1 hover:bg-sky-500/10 cursor-pointer transition-colors border-sky-500/20 text-sky-600 dark:text-sky-400"
                >
                  <Twitter className="h-3 w-3" /> X
                </Badge>
              )}
              {data.overview.telegram && (
                <Badge
                  variant="outline"
                  className="h-6 px-2 gap-1 hover:bg-sky-500/10 cursor-pointer transition-colors border-sky-500/20 text-sky-600 dark:text-sky-400"
                >
                  <Send className="h-3 w-3" /> TG
                </Badge>
              )}
            </div>
          </div>

          {data.overview.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.overview.description}
            </p>
          )}

          {data.overview.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {data.overview.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="p-3 rounded-lg bg-background/50 border border-border/40"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {metric.label}
                    </span>
                    {formatChange(metric.change, metric.unit)}
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {metric.value}
                  </div>
                  {metric.changeLabel && (
                    <p className="text-[10px] text-muted-foreground">
                      {metric.changeLabel}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.overview.mint && (
            <div className="mt-2 rounded-lg overflow-hidden border border-border/40 shadow-sm">
              <MoralisPriceChart
                chainId="solana"
                tokenAddress={data.overview.mint}
                height={320}
              />
            </div>
          )}

          {data.relatedTokens.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                Related Tokens
                <div className="h-px flex-1 bg-border/50" />
              </h4>
              <div className="space-y-2">
                {data.relatedTokens.map((token) => (
                  <div
                    key={token.mint}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/40 hover:border-sky-500/30 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-sm text-foreground">
                        {token.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {token.mint.substring(0, 8)}...
                      </div>
                    </div>
                    {token.reason && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] opacity-80 max-w-[150px] truncate"
                      >
                        {token.reason}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Container>
      );
    }

    case "chat_digest": {
      return (
        <Container
          title={data.headline || "Chat Digest"}
          icon={MessageSquare}
          gradientFrom="from-violet-500"
          gradientTo="to-fuchsia-500"
        >
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-2 rounded bg-background/40 text-center">
              <p className="text-[10px] uppercase text-muted-foreground font-bold">
                Msgs
              </p>
              <p className="text-lg font-bold">{data.stats.messageCount}</p>
            </div>
            <div className="p-2 rounded bg-background/40 text-center">
              <p className="text-[10px] uppercase text-muted-foreground font-bold">
                Users
              </p>
              <p className="text-lg font-bold">{data.stats.uniqueUsers}</p>
            </div>
            <div className="p-2 rounded bg-background/40 text-center">
              <p className="text-[10px] uppercase text-muted-foreground font-bold">
                Sentiment
              </p>
              <p
                className={cn(
                  "text-lg font-bold",
                  (data.stats.sentimentScore || 0) > 0
                    ? "text-[#8eb94f]"
                    : "text-amber-500",
                )}
              >
                {data.stats.sentimentScore?.toFixed(2) ?? "-"}
              </p>
            </div>
          </div>

          {data.stats.trendingKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {data.stats.trendingKeywords.map((kw: string, i: number) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
                >
                  #{kw}
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Recent Activity
            </h4>
            <ScrollArea className="h-[250px] pr-3">
              <div className="space-y-3">
                {data.messages.length ? (
                  data.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "p-3 rounded-lg text-sm border",
                        msg.highlighted
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-background/40 border-border/40",
                      )}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-foreground">
                          {msg.author}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {msg.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No messages available.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </Container>
      );
    }

    case "trend_report": {
      return (
        <Container
          title={data.headline || "Trend Report"}
          icon={TrendingUp}
          gradientFrom="from-emerald-500"
          gradientTo="to-sky-500"
        >
          <div className="flex justify-between items-center text-xs text-muted-foreground border-b border-border/40 pb-2 mb-2">
            <span>Generated At</span>
            <span>{new Date(data.generatedAt).toLocaleString()}</span>
          </div>

          {data.summary && (
            <p className="text-sm text-muted-foreground italic border-l-2 border-emerald-500/50 pl-3 py-1 bg-[#8eb94f]/5 rounded-r">
              {data.summary}
            </p>
          )}

          {data.featuredCoins.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Featured Coins
              </h4>
              <div className="space-y-2">
                {data.featuredCoins.map((coin) => (
                  <div
                    key={coin.mint}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{coin.name}</span>
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1"
                        >
                          {coin.symbol}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {coin.mint.substring(0, 8)}...
                      </span>
                    </div>
                    <div className="text-right">
                      {coin.score && (
                        <Badge className="bg-[#8eb94f]/10 text-emerald-600 dark:text-emerald-400 border-none mb-1">
                          Score {coin.score.toFixed(1)}
                        </Badge>
                      )}
                      <div>{formatChange(coin.change24h)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.insights.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Key Insights
              </h4>
              <div className="space-y-2">
                {data.insights.map((insight, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-background/40 border border-border/40"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm">
                        {insight.title}
                      </span>
                      {insight.score && (
                        <span className="text-[10px] text-muted-foreground">
                          {(insight.score * 100).toFixed(0)}% Conf
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {insight.description}
                    </p>
                    {insight.timeframe && (
                      <Badge
                        variant="secondary"
                        className="mt-2 text-[9px] h-4"
                      >
                        {insight.timeframe}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Container>
      );
    }

    default:
      return (
        <Artifact className="space-y-0">
          <ArtifactHeader>
            <ArtifactTitle>Pump.fun Error</ArtifactTitle>
          </ArtifactHeader>
          <ArtifactContent>
            <div className="border-destructive/20 bg-destructive/5 text-destructive p-4 rounded-lg">
              <p className="text-sm font-medium">
                Unsupported Pump.fun view type.
              </p>
            </div>
          </ArtifactContent>
        </Artifact>
      );
  }
}
