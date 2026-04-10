"use client";

import { useChainId } from "wagmi";

import { useLocale } from "@/components/providers/locale-provider";
import {
  FooterEthIcon,
  FooterGasIcon,
} from "@/components/dashboard/footer/footer-metric-icons";
import { useGasPrices } from "@/hooks/useGasPrices";
import { useLiveAsset } from "@/hooks/use-live-asset";

function PricePill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div
      className="box-border flex h-8 flex-row items-center justify-center gap-1.5 rounded-[var(--artifact-radius-pill)] border border-[var(--artifact-border)] bg-[var(--artifact-toolbar)] px-4 text-[var(--artifact-foreground)] shadow-[var(--artifact-shadow)] backdrop-blur-sm"
      aria-label={label}
    >
      {icon}
      <span className="flex items-center text-center text-[11px] font-medium leading-[13px] text-[inherit]">
        {value}
      </span>
    </div>
  );
}

function useChatEthPriceValue() {
  const chainId = useChainId();
  const locale = useLocale();
  const { price } = useLiveAsset("eth", 0, String(chainId));

  return price > 0
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price)
    : "-";
}

function useChatGasPriceValue() {
  const chainId = useChainId();
  const { formattedGas } = useGasPrices(chainId);

  return formattedGas ? `${formattedGas}` : "-";
}

export function ChatEthPricePill() {
  const formattedEth = useChatEthPriceValue();

  return (
    <PricePill
      icon={
        <FooterEthIcon className="size-3 shrink-0 text-[var(--artifact-muted)]" />
      }
      value={formattedEth}
      label="ETH price"
    />
  );
}

export function ChatGasPricePill() {
  const gasDisplay = useChatGasPriceValue();

  return (
    <PricePill
      icon={
        <FooterGasIcon className="size-3 shrink-0 text-[var(--artifact-muted)]" />
      }
      value={gasDisplay}
      label="Gas price"
    />
  );
}

export function ChatPricePills() {
  const formattedEth = useChatEthPriceValue();
  const gasDisplay = useChatGasPriceValue();

  return (
    <div className="flex items-center gap-2">
      <PricePill
        icon={
          <FooterEthIcon className="size-3 shrink-0 text-[var(--artifact-muted)]" />
        }
        value={formattedEth}
        label="ETH price"
      />
      <PricePill
        icon={
          <FooterGasIcon className="size-3 shrink-0 text-[var(--artifact-muted)]" />
        }
        value={gasDisplay}
        label="Gas price"
      />
    </div>
  );
}
