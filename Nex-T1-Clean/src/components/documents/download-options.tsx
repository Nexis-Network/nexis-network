"use client";

import { ChevronDown, Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DownloadOptionsProps {
  onDownload: (format: string, scale: number) => void;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

export function DownloadOptions({
  onDownload,
  className = "",
  onOpenChange,
}: DownloadOptionsProps) {
  const [selectedFormat, setSelectedFormat] = useState("png");
  const [selectedScale, setSelectedScale] = useState(1);
  const [isAnyDropdownOpen, setIsAnyDropdownOpen] = useState(false);

  const formats = ["png", "jpg", "webp"];
  const scales = [
    { label: "Original", value: 1 },
    { label: "0.5x", value: 0.5 },
    { label: "2x", value: 2 },
  ];

  // Notify parent of any dropdown state changes
  useEffect(() => {
    onOpenChange?.(isAnyDropdownOpen);
  }, [isAnyDropdownOpen, onOpenChange]);

  return (
    <div
      className={`flex gap-1.5 p-1.5 ${className}`}
    >
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) setIsAnyDropdownOpen(true);
          else setTimeout(() => setIsAnyDropdownOpen(false), 100);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            className="h-8 rounded-xl px-2 text-xs transition-colors"
            size="sm"
            variant="outline"
          >
            {selectedFormat.toUpperCase()}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="p-2"
        >
          {formats.map((format) => (
            <DropdownMenuItem
              className="rounded-xl text-xs"
              key={format}
              onClick={() => setSelectedFormat(format)}
            >
              {format.toUpperCase()}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu
        onOpenChange={(open) => {
          if (open) setIsAnyDropdownOpen(true);
          else setTimeout(() => setIsAnyDropdownOpen(false), 100);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            className="h-8 rounded-xl px-2 text-xs transition-colors"
            size="sm"
            variant="outline"
          >
            {scales.find((s) => s.value === selectedScale)?.label}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="p-2"
        >
          {scales.map((scale) => (
            <DropdownMenuItem
              className="rounded-xl text-xs"
              key={scale.value}
              onClick={() => setSelectedScale(scale.value)}
            >
              {scale.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        className="h-8 rounded-xl px-3 text-xs transition-colors"
        onClick={() => onDownload(selectedFormat, selectedScale)}
        size="sm"
      >
        <Download className="mr-1 h-3 w-3" />
        Download
      </Button>
    </div>
  );
}
