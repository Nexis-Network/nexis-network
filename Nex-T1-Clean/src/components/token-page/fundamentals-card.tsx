import React, { useEffect, useMemo, useRef, useState } from "react";

import { Check, ChevronDown, Copy } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NativeChainLogo } from "@/components/ui/native-chain-logo";
import { CHAIN_ICON_ALIASES, DEFAULT_CHAIN_ICON } from "@/lib/chain-icons";
import { ICON_MANIFEST } from "@/lib/generated/icon-manifest";

import { cn } from "@/lib/utils";

import { TOKEN_PANEL_FRAME_CLASS, TOKEN_PANEL_INNER_CLASS } from "./constants";

const DESCRIPTION_COLLAPSE_LIMIT = 240;

type ContractReference = {
  chain?: string | null;
  address?: string | null;
};

export type FundamentalsField = {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
  align?: "start" | "end";
  isMono?: boolean;
  contracts?: ContractReference[];
};

type FundamentalsCardProps = {
  fields: FundamentalsField[];
  description: string;
};

export function FundamentalsCard({ fields, description }: FundamentalsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { collapsedText, canToggle } = useMemo(() => {
    const trimmed = description ?? "";
    if (!trimmed) {
      return { collapsedText: "", canToggle: false };
    }
    if (trimmed.length <= DESCRIPTION_COLLAPSE_LIMIT) {
      return { collapsedText: trimmed, canToggle: false };
    }
    return {
      collapsedText: `${trimmed.slice(0, DESCRIPTION_COLLAPSE_LIMIT).trim()}…`,
      canToggle: true,
    };
  }, [description]);

  const descriptionCopy = expanded || !canToggle ? description : collapsedText;

  return (
    <section
      className={cn(
        TOKEN_PANEL_FRAME_CLASS,
        "relative w-full min-h-[407px] p-0! text-foreground",
      )}
    >
      <div
        className={cn(
          TOKEN_PANEL_INNER_CLASS,
          "flex min-h-[389px] w-full flex-col gap-[4px] rounded-[12px] bg-card px-[17px] py-[9px]",
        )}
      >
        <div className="flex flex-col gap-[4px]">
          <dl className="flex flex-col">
            {fields.map((field, index) => (
              <div
                key={`${field.label}-${index}`}
                className="flex flex-col pb-[4px]"
              >
                <div className="flex h-[25px] w-full items-center justify-between border-b border-border pb-[5px]">
                  <dt className="flex h-[18px] items-center text-sm font-medium leading-[18px] tracking-[0.16px] text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd
                    className={cn(
                      "flex h-[20px] items-center text-sm font-light leading-5 tracking-[0.16px] text-foreground",
                      field.align === "end" ? "text-right" : "text-left",
                      field.tone === "positive" && "text-sky-400",
                      field.tone === "negative" && "text-destructive",
                      field.isMono && !field.contracts && "font-mono text-[13px] tracking-tight",
                    )}
                  >
                    {field.contracts?.length ? (
                      <ContractAddressesField contracts={field.contracts} fallbackValue={field.value} />
                    ) : (
                      field.value || "--"
                    )}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {description ? (
          <div className="flex w-full flex-col gap-[5.25px] pb-[2.75px] pt-[9px]">
            <p className="w-[260px] text-[14px] font-light leading-5 tracking-[0.16px] text-muted-foreground">
              {descriptionCopy}
            </p>
            {canToggle ? (
              <button
                type="button"
                className="text-left text-[12px] font-medium leading-4 tracking-[0.16px] text-muted-foreground/50 transition hover:text-foreground"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type ContractAddressesFieldProps = {
  contracts: ContractReference[];
  fallbackValue?: string;
};

function ContractAddressesField({ contracts, fallbackValue }: ContractAddressesFieldProps) {
  const sanitizedContracts = useMemo(
    () => contracts.filter((contract) => typeof contract.address === "string" && contract.address?.trim()),
    [contracts],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sanitizedContracts.length === 0) {
      setActiveIndex(0);
    } else if (activeIndex > sanitizedContracts.length - 1) {
      setActiveIndex(0);
    }
  }, [sanitizedContracts, activeIndex]);

  const fallbackAddress = fallbackValue && fallbackValue !== "--" ? fallbackValue : "";
  const activeContract = sanitizedContracts[activeIndex] ?? sanitizedContracts[0] ?? null;
  const selectedValue = activeContract?.address ?? fallbackAddress;
  const formattedValue = formatContractAddress(selectedValue);

  if (!formattedValue || formattedValue === "--") {
    return <span className="text-muted-foreground">--</span>;
  }

  const showDropdown = sanitizedContracts.length > 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showDropdown ? (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border-transparent bg-transparent px-3 py-1 font-mono text-[13px] tracking-tight text-foreground transition"
              aria-label="Select deployment address"
            >
              <span>{formattedValue}</span>
              <ChevronDown className={cn("size-3.5 text-muted-foreground transition", open && "rotate-180")} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px] rounded-xl">
            {sanitizedContracts.map((contract, index) => {
              const addressValue = formatContractAddress(contract.address);
              return (
                <DropdownMenuItem
                  key={`${contract.chain ?? "chain"}-${contract.address ?? index}`}
                  className="flex cursor-pointer flex-col gap-2 rounded-xl py-2"
                  onSelect={(event) => {
                    event.preventDefault();
                    setActiveIndex(index);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <NativeChainLogo
                        src={getChainIconForLabel(contract.chain)}
                        alt={`${contract.chain ?? "Chain"} icon`}
                        className="h-4 w-4"
                      />
                      <div className="flex flex-col items-start text-left">
                        <span className="text-[11px] font-medium uppercase tracking-[0.16px] text-muted-foreground">
                          {contract.chain ?? "Unknown chain"}
                        </span>
                        <span className="font-mono text-sm tracking-tight text-foreground">{addressValue}</span>
                      </div>
                    </div>
                    <div className="ml-auto">
                      <CopyAddressButton value={contract.address} size="sm" />
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="font-mono text-[13px] tracking-tight text-foreground">{formattedValue}</span>
      )}
      <CopyAddressButton value={selectedValue} />
    </div>
  );
}

type CopyAddressButtonProps = {
  value?: string | null;
  size?: "md" | "sm";
};

function CopyAddressButton({ value, size = "md" }: CopyAddressButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    setCopied(false);
  }, [value]);

  if (!value || value === "--") {
    return null;
  }

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const iconSize = size === "sm" ? "size-3" : "size-3.5";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        void handleCopy();
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border-transparent bg-transparent text-muted-foreground transition hover:text-foreground",
        size === "sm" ? "h-6 w-6" : "h-7 w-7",
      )}
      aria-label="Copy contract address"
    >
      {copied ? <Check className={cn(iconSize, "text-green-500")} /> : <Copy className={iconSize} />}
    </button>
  );
}

function formatContractAddress(value?: string | null) {
  if (!value) {
    return "--";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "--";
  }
  if (trimmed.length <= 11) {
    return trimmed;
  }
  return `${trimmed.slice(0, 5)}…${trimmed.slice(-5)}`;
}

function getChainIconForLabel(label?: string | null): string {
  if (!label) {
    return DEFAULT_CHAIN_ICON;
  }
  const normalized = label.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_CHAIN_ICON;
  }
  const alias = CHAIN_ICON_ALIASES[normalized];
  if (alias) {
    return alias;
  }
  const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) {
    return DEFAULT_CHAIN_ICON;
  }
  const manifestEntry = ICON_MANIFEST["chain-icons"][slug];
  if (manifestEntry?.length) {
    return manifestEntry[0];
  }
  return DEFAULT_CHAIN_ICON;
}
