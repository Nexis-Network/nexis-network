"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TableData = {
  headers: string[];
  rows: string[][];
};

type MarketOverviewSection = {
  id: string;
  title: string;
  subtitle?: string;
  table?: TableData;
  note?: string;
};

export type CrossChainMarketOverviewData = {
  sections: MarketOverviewSection[];
};

const SECTION_REGEX = /^###\s+(.+)\n([\s\S]*?)(?=^###\s+|\Z)/gm;

export function parseCrossChainMarketOverview(raw?: string): CrossChainMarketOverviewData | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized.includes("|") || !normalized.toLowerCase().includes("cross-chain")) {
    // Heuristic: only restructure when response clearly matches the market overview format
    if (!normalized.includes("Total Value Locked") || !normalized.includes("Perpetual Funding")) {
      return null;
    }
  }

  const sections: MarketOverviewSection[] = [];

  let match: RegExpExecArray | null;
  while ((match = SECTION_REGEX.exec(normalized)) !== null) {
    const [, rawTitle, body] = match;
    if (!rawTitle || !body) continue;

    const title = sanitizeTitle(rawTitle);
    const { table, note, subtitle } = extractSectionContent(body);

    sections.push({
      id: slugify(title),
      title,
      subtitle,
      table,
      note,
    });
  }

  if (!sections.length) {
    return null;
  }

  return { sections };
}

export function CrossChainMarketOverviewMessage({ data }: { data: CrossChainMarketOverviewData }) {
  return (
    <div className="space-y-6">
      {data.sections.map((section) => (
        <Card
          key={section.id}
          className="border-border/60 bg-background/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-regular text-foreground">{section.title}</CardTitle>
            {section.subtitle ? (
              <CardDescription className="text-xs text-muted-foreground/80">{section.subtitle}</CardDescription>
            ) : null}
          </CardHeader>
          {section.table ? (
            <CardContent className="space-y-3 pt-0">
              <Table className="border border-border/40 rounded-lg overflow-hidden">
                <TableHeader className="bg-muted/40 text-xs uppercase tracking-wide">
                  <TableRow>
                    {section.table.headers.map((header, idx) => (
                      <TableHead key={`${section.id}-head-${idx}`} className="text-xs font-regular text-muted-foreground">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="text-sm">
                  {section.table.rows.map((row, rowIdx) => (
                    <TableRow key={`${section.id}-row-${rowIdx}`}>
                      {row.map((cell, cellIdx) => (
                        <TableCell key={`${section.id}-cell-${rowIdx}-${cellIdx}`} className="align-top">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {section.note ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary/80">
                  {section.note}
                </div>
              ) : null}
            </CardContent>
          ) : (
            section.note && (
              <CardContent className="pt-0">
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary/80">
                  {section.note}
                </div>
              </CardContent>
            )
          )}
        </Card>
      ))}
    </div>
  );
}

function extractSectionContent(body: string): {
  table?: TableData;
  note?: string;
  subtitle?: string;
} {
  const lines = body
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "---");

  const tableStart = lines.findIndex((line) => line.startsWith("|"));
  let table: TableData | undefined;
  let note: string | undefined;
  let subtitle: string | undefined;

  if (tableStart !== -1) {
    let tableEnd = tableStart;
    while (tableEnd < lines.length && lines[tableEnd].startsWith("|")) {
      tableEnd += 1;
    }

    const tableLines = lines.slice(tableStart, tableEnd);
    if (tableLines.length >= 2) {
      const headers = parseMarkdownRow(tableLines[0]);
      const rows = tableLines
        .slice(2) // Skip header + alignment row
        .map(parseMarkdownRow)
        .filter((row) => row.length);

      if (headers.length && rows.length) {
        table = { headers, rows };
      }
    }

    const remainder = lines.slice(tableEnd);
    if (remainder.length) {
      const firstLine = remainder[0];
      if (firstLine.startsWith("→") || firstLine.startsWith("**→")) {
        // Treat strong callout as note
        note = cleanInlineMarkdown(remainder.join(" "));
      } else {
        subtitle = cleanInlineMarkdown(remainder.join(" "));
      }
    }
  } else if (lines.length) {
    subtitle = cleanInlineMarkdown(lines.join(" "));
  }

  return { table, note, subtitle };
}

function parseMarkdownRow(row: string): string[] {
  const parts = row.split("|").map((cell) => cell.trim());
  if (!parts.length) return [];

  if (parts[0] === "") {
    parts.shift();
  }
  if (parts[parts.length - 1] === "") {
    parts.pop();
  }

  return parts
    .map((cell) => cleanInlineMarkdown(cell))
    .filter((cell) => cell.length > 0);
}

function cleanInlineMarkdown(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeTitle(value: string): string {
  return cleanInlineMarkdown(value.replace(/^\d+\.\s*/, ""));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "section";
}
