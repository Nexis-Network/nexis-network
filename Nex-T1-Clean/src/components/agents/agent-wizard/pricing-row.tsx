"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { AgentListingType } from "@/lib/agents/types";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChainSelect } from "@/components/agents/chain-select";
import { AssetSelect } from "@/components/agents/asset-select";
import { PriceInput } from "@/components/agents/price-input";

import type { AgentWizardValues } from "./schema";
import { WIZARD_SUBPANEL, WIZARD_SELECT, SECTION_LABEL } from "./constants";

export function PricingRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { control, setValue } = useFormContext<AgentWizardValues>();
  const chainId = useWatch({ control, name: `pricing.${index}.networkId` });
  const priceBaseUnits = useWatch({ control, name: `pricing.${index}.priceBaseUnits` }) ?? "";
  const decimals = useWatch({ control, name: `pricing.${index}.currencyDecimals` }) ?? 0;
  const assetId = useWatch({ control, name: `pricing.${index}.assetId` });

  return (
    <div className={`${WIZARD_SUBPANEL} space-y-3 p-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--settings-foreground-strong)]">Listing {index + 1}</h3>
        <Button
          type="button"
          variant="ghost"
          className="h-auto p-0 text-xs text-[var(--settings-foreground-subtle)] hover:text-[var(--settings-foreground-strong)]"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
      <FormField
        control={control}
        name={`pricing.${index}.listingType`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className={SECTION_LABEL}>Type</FormLabel>
            <select
              className={WIZARD_SELECT}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value as AgentListingType)}
            >
              <option value="sale">Buy</option>
              <option value="rent">Rent</option>
              <option value="usage">Usage</option>
            </select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`pricing.${index}.networkId`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className={SECTION_LABEL}>Network</FormLabel>
            <FormControl>
              <ChainSelect
                value={field.value}
                onChange={(option) => {
                  field.onChange(option.caip2);
                  setValue(`pricing.${index}.assetId`, undefined);
                  setValue(`pricing.${index}.currencySymbol`, option.nativeSymbol);
                  setValue(`pricing.${index}.currencyDecimals`, option.nativeDecimals);
                  setValue(`pricing.${index}.priceBaseUnits`, "0");
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`pricing.${index}.assetId`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className={SECTION_LABEL}>Asset</FormLabel>
            <FormControl>
              <AssetSelect
                chainId={chainId}
                value={assetId}
                onChange={(option) => {
                  field.onChange(option.caip19 ?? undefined);
                  setValue(`pricing.${index}.currencySymbol`, option.symbol);
                  setValue(`pricing.${index}.currencyDecimals`, option.decimals);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`pricing.${index}.priceBaseUnits`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className={SECTION_LABEL}>Price (base units)</FormLabel>
            <FormControl>
              <PriceInput
                value={priceBaseUnits}
                decimals={decimals}
                onChange={(next) => field.onChange(next)}
                onDecimalsChange={(value) => setValue(`pricing.${index}.currencyDecimals`, value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
