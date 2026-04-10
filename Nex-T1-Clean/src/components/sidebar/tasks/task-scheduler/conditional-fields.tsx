import type { Path, UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchedulerFormLabel } from "./shared";
import type { ConditionType, TaskSchedulerFormValues } from "./schema";

export type ConditionalFieldsProps = {
  index: number;
  form: UseFormReturn<TaskSchedulerFormValues>;
};

type ConditionalFieldSegment =
  | "type"
  | "asset"
  | "symbol"
  | "direction"
  | "thresholdPercent"
  | "thresholdValue"
  | "keyword"
  | "contract"
  | "eventSignature"
  | "portfolioSlice";

export function ConditionalFields({ index, form }: ConditionalFieldsProps) {
  const buildPath = <Segment extends ConditionalFieldSegment>(segment: Segment) =>
    `conditionalConditions.${index}.${segment}` as Path<TaskSchedulerFormValues>;
  const stringify = (value: UntypedJson) => (typeof value === "string" ? value : "");

  const type = form.watch(buildPath("type")) as ConditionType;

  const renderAssetFields = type === "market_price_percent" || type === "market_price_amount" || type === "trade_volume";
  const showDirection = type === "market_price_percent" || type === "market_price_amount" || type === "holder_change";
  const showPercent = type === "market_price_percent" || type === "portfolio_percent" || type === "holder_change";
  const showAbsolute = type === "market_price_amount" || type === "trade_volume";

  return (
    <div className="mt-4 space-y-3">
      {renderAssetFields ? (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <FormField
            control={form.control}
            name={buildPath("asset")}
            render={({ field }) => (
              <FormItem>
                <SchedulerFormLabel>Asset</SchedulerFormLabel>
                <FormControl>
                  <Input placeholder="BTC" {...field} value={stringify(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={buildPath("symbol")}
            render={({ field }) => (
              <FormItem>
                <SchedulerFormLabel>Symbol / ticker</SchedulerFormLabel>
                <FormControl>
                  <Input placeholder="BTC-USD" {...field} value={stringify(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}

      {showDirection ? (
        <FormField
          control={form.control}
          name={buildPath("direction")}
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Direction</SchedulerFormLabel>
              <Select value={stringify(field.value)} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="above">Above / increase</SelectItem>
                  <SelectItem value="below">Below / decrease</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {showPercent ? (
        <FormField
          control={form.control}
          name={buildPath("thresholdPercent")}
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Threshold (%)</SchedulerFormLabel>
              <FormControl>
                <Input placeholder="5" {...field} value={stringify(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {showAbsolute ? (
        <FormField
          control={form.control}
          name={buildPath("thresholdValue")}
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Threshold (amount)</SchedulerFormLabel>
              <FormControl>
                <Input placeholder="500000" {...field} value={stringify(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {type === "news" ? (
        <FormField
          control={form.control}
          name={buildPath("keyword")}
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Keyword</SchedulerFormLabel>
              <FormControl>
                <Input placeholder="Restaking" {...field} value={stringify(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {type === "smart_contract_event" ? (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <FormField
            control={form.control}
            name={buildPath("contract")}
            render={({ field }) => (
              <FormItem>
                <SchedulerFormLabel>Contract</SchedulerFormLabel>
                <FormControl>
                  <Input placeholder="0x..." {...field} value={stringify(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={buildPath("eventSignature")}
            render={({ field }) => (
              <FormItem>
                <SchedulerFormLabel>Event signature</SchedulerFormLabel>
                <FormControl>
                  <Input placeholder="Transfer(address,address,uint256)" {...field} value={stringify(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}

      {type === "portfolio_percent" ? (
        <FormField
          control={form.control}
          name={buildPath("portfolioSlice")}
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Portfolio slice</SchedulerFormLabel>
              <FormControl>
                <Input placeholder="Treasury, Trading desk, ..." {...field} value={stringify(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}
