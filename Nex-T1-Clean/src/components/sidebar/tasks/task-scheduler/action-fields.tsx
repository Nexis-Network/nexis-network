import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UseFormReturn } from "react-hook-form";

import { SchedulerFormLabel } from "./shared";
import { dexVenueValues, type TaskSchedulerFormValues } from "./schema";

export type ActionFieldsProps = {
  form: UseFormReturn<TaskSchedulerFormValues>;
};

export function NewsActionFields({ form }: ActionFieldsProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border/40 p-4">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <FormField
          control={form.control}
          name="newsTopic"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Topic or keyword</SchedulerFormLabel>
              <FormControl>
                <Input placeholder="Daily crypto headlines" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newsLimit"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Stories to include</SchedulerFormLabel>
              <FormControl>
                <Input type="number" min="3" max="20" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-wrap gap-6">
        <FormField
          control={form.control}
          name="newsDeliverInApp"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <SchedulerFormLabel className="mb-0 font-normal">Show in app</SchedulerFormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newsDeliverEmail"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <SchedulerFormLabel className="mb-0 font-normal">Email summary</SchedulerFormLabel>
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="newsEmail"
        render={({ field }) => (
          <FormItem>
            <SchedulerFormLabel>Email (optional)</SchedulerFormLabel>
            <FormControl>
              <Input placeholder="you@example.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export function TradeActionFields({ form }: ActionFieldsProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border/40 p-4">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <FormField
          control={form.control}
          name="tradeVenue"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Venue</SchedulerFormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select venue" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {dexVenueValues.map((venue) => (
                    <SelectItem key={venue} value={venue}>
                      {venue === "0x" ? "0x" : venue.charAt(0).toUpperCase() + venue.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tradeChainId"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Chain ID</SchedulerFormLabel>
              <FormControl>
                <Input placeholder="1 for Ethereum, 8453 for Base..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tradeSide"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Side</SchedulerFormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Buy or Sell" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <FormField
          control={form.control}
          name="tradeBaseToken"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Base token</SchedulerFormLabel>
              <FormControl>
                <Input placeholder="ETH" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tradeQuoteToken"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Quote token</SchedulerFormLabel>
              <FormControl>
                <Input placeholder="USDC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tradeAmount"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Amount</SchedulerFormLabel>
              <FormControl>
                <Input type="number" min="0" step="0.0001" placeholder="1000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tradeAmountMode"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Amount represents</SchedulerFormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sell or buy amount" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sell">Sell amount</SelectItem>
                  <SelectItem value="buy">Buy amount</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <FormField
          control={form.control}
          name="tradeSlippage"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Slippage (bps)</SchedulerFormLabel>
              <FormControl>
                <Input type="number" min="5" max="2000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tradeExecutionMode"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Execution</SchedulerFormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Simulate or execute" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="simulate">Simulate (recommendation only)</SelectItem>
                  <SelectItem value="execute">Execute via treasury wallet</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
