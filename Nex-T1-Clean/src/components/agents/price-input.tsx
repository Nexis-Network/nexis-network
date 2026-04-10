"use client";

import { useMemo } from "react";

import { AnimatedNumberInput } from "@/components/numbers/input-animation";
import { Input } from "@/components/ui/input";
import { formatBaseUnits } from "@/lib/agents/format";

type PriceInputProps = {
  value: string;
  onChange: (value: string) => void;
  decimals: number;
  onDecimalsChange?: (decimals: number) => void;
  disabled?: boolean;
  id?: string;
};

export function PriceInput({ value, onChange, decimals, onDecimalsChange, disabled, id }: PriceInputProps) {
  const humanized = useMemo(() => {
    if (!value) return "0";
    return formatBaseUnits(value, decimals);
  }, [value, decimals]);

  return (
    <div className="space-y-2">
      <Input
        animateNumeric
        id={id}
        value={value}
        onChange={(event) => {
          const next = event.target.value.replace(/[^0-9]/g, "");
          onChange(next);
        }}
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="Base units"
        disabled={disabled}
        className="bg-[var(--settings-elevated)]"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Humanized: {humanized}</span>
        {onDecimalsChange ? (
          <label className="inline-flex items-center gap-2">
            <span>Decimals</span>
            <AnimatedNumberInput
              align="right"
              type="number"
              min={0}
              max={30}
              className="w-16 rounded-md border border-[var(--settings-border)] bg-[var(--settings-elevated)] px-2 py-1 text-right text-xs text-[var(--settings-foreground-strong)]"
              value={decimals}
              onChange={(event) => onDecimalsChange(Number(event.target.value))}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
