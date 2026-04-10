import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type {
  FieldArrayWithId,
  FieldPath,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormReturn,
} from "react-hook-form";

import { SchedulerFormLabel } from "./shared";
import { ConditionalFields } from "./conditional-fields";
import {
  longTermHorizonOptions,
  shortTermUnits,
  weekdayOptions,
  conditionTypeOptions,
} from "./schema";
import { HorizonMultiSelect } from "./horizon-multi-select";
import type { TaskSchedulerFormValues } from "./schema";

const DateTimeFields = ({
  form,
  dateName,
  timeName,
  dateLabel,
  timeLabel,
}: {
  form: UseFormReturn<TaskSchedulerFormValues>;
  dateName: FieldPath<TaskSchedulerFormValues>;
  timeName: FieldPath<TaskSchedulerFormValues>;
  dateLabel: string;
  timeLabel: string;
}) => (
  <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
    <FormField
      control={form.control}
      name={dateName}
      render={({ field }) => (
        <FormItem>
          <SchedulerFormLabel>{dateLabel}</SchedulerFormLabel>
          <FormControl>
            <Input
              type="date"
              className="border-border/60 bg-card text-foreground shadow-none hover:border-sky-400/30 hover:bg-sky-400/5 focus-visible:ring-sky-400/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20 dark:hover:bg-white/10"
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      control={form.control}
      name={timeName}
      render={({ field }) => (
        <FormItem>
          <SchedulerFormLabel>{timeLabel}</SchedulerFormLabel>
          <FormControl>
            <Input
              type="time"
              className="border-border/60 bg-card text-foreground shadow-none hover:border-sky-400/30 hover:bg-sky-400/5 focus-visible:ring-sky-400/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20 dark:hover:bg-white/10"
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

export type FutureScheduleFieldsProps = {
  form: UseFormReturn<TaskSchedulerFormValues>;
};

export function FutureScheduleFields({ form }: FutureScheduleFieldsProps) {
  return (
    <FormField
      control={form.control}
      name="futureDateTime"
      render={({ field }) => (
        <FormItem>
          <SchedulerFormLabel>Execute on</SchedulerFormLabel>
          <FormControl>
            <Input
              type="datetime-local"
              className="border-border/60 bg-card text-foreground shadow-none hover:border-sky-400/30 hover:bg-sky-400/5 focus-visible:ring-sky-400/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20 dark:hover:bg-white/10"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ShortTermScheduleFields({ form }: FutureScheduleFieldsProps) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
      <FormField
        control={form.control}
        name="shortTermValue"
        render={({ field }) => (
          <FormItem>
            <SchedulerFormLabel>Wait this long</SchedulerFormLabel>
            <FormControl>
              <Input type="number" min="0" step="0.1" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="shortTermUnit"
        render={({ field }) => (
          <FormItem>
            <SchedulerFormLabel>Unit</SchedulerFormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {shortTermUnits.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export function LongTermScheduleFields({ form }: FutureScheduleFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="longTermSelections"
        render={({ field }) => (
          <FormItem>
            <SchedulerFormLabel>Select horizons</SchedulerFormLabel>
            <FormControl>
              <HorizonMultiSelect
                options={longTermHorizonOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder="Choose timelines"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <DateTimeFields
        form={form}
        dateName="longTermStartDate"
        timeName="longTermStartTime"
        dateLabel="Start from date"
        timeLabel="Start time"
      />
    </div>
  );
}

export type ConditionalScheduleFieldsProps = {
  fields: FieldArrayWithId<TaskSchedulerFormValues, "conditionalConditions", "id">[];
  append: UseFieldArrayAppend<TaskSchedulerFormValues, "conditionalConditions">;
  remove: UseFieldArrayRemove;
  form: UseFormReturn<TaskSchedulerFormValues>;
};

export function ConditionalScheduleFields({ fields, append, remove, form }: ConditionalScheduleFieldsProps) {
  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground text-regular">
          Add one or more triggers covering market movements, news, or on-chain events.
        </p>
      ) : null}
      {fields.map((fieldItem, index) => (
        <div key={fieldItem.id} className="rounded-2xl border border-border/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FormField
              control={form.control}
              name={`conditionalConditions.${index}.type`}
              render={({ field }) => (
                <FormItem className="sm:flex-1">
                  <SchedulerFormLabel>Condition type</SchedulerFormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {conditionTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="sm" className="text-regular" onClick={() => remove(index)}>
              Remove
            </Button>
          </div>

          <ConditionalFields index={index} form={form} />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="text-regular"
        onClick={() =>
          append({
            type: "market_price_percent",
            direction: "above",
            asset: "",
            symbol: "",
            thresholdPercent: "",
            thresholdValue: "",
            keyword: "",
            contract: "",
            eventSignature: "",
            portfolioSlice: "",
          })
        }
      >
        Add condition
      </Button>
      {form.formState.errors.conditionalConditions ? (
        <p className="text-sm text-destructive">
          {form.formState.errors.conditionalConditions?.message as string}
        </p>
      ) : null}
    </div>
  );
}

export function LoopScheduleFields({ form }: FutureScheduleFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <FormField
          control={form.control}
          name="loopFrequency"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Frequency</SchedulerFormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="loopInterval"
          render={({ field }) => (
            <FormItem>
              <SchedulerFormLabel>Every</SchedulerFormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {form.watch("loopFrequency") === "weekly" ? (
        <FormField
          control={form.control}
          name="loopWeekdays"
          render={() => (
            <FormItem>
              <SchedulerFormLabel>Weekdays</SchedulerFormLabel>
              <div className="flex flex-wrap gap-2">
                {weekdayOptions.map((day) => (
                  <label
                    key={day.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 px-3 py-1 text-sm"
                  >
                    <Checkbox
                      checked={form.watch("loopWeekdays").includes(day.value)}
                      onCheckedChange={(checked) => {
                        const next = new Set(form.getValues("loopWeekdays"));
                        if (checked) {
                          next.add(day.value);
                        } else {
                          next.delete(day.value);
                        }
                        form.setValue("loopWeekdays", Array.from(next));
                      }}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <DateTimeFields
        form={form}
        dateName="loopStartDate"
        timeName="loopStartTime"
        dateLabel="Start date"
        timeLabel="Start time"
      />

      <FormField
        control={form.control}
        name="loopTimezone"
        render={({ field }) => (
          <FormItem>
            <SchedulerFormLabel>Timezone</SchedulerFormLabel>
            <FormControl>
              <Input placeholder="e.g. America/New_York" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
