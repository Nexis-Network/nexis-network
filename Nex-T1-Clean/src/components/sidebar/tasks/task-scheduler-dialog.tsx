"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { glassSurfaceClass, glassSurfaceStyle } from "@/lib/ui/surface";
import { cn } from "@/lib/utils";
import { useScheduleTask, type ScheduleTaskResponse } from "@/hooks/tasks/use-schedule-task";

import {
  actionOptions,
  createDefaultValues,
  scheduleOptions,
  taskSchedulerResolver,
  type TaskSchedulerFormValues,
} from "./task-scheduler/schema";
import { SchedulerFormLabel } from "./task-scheduler/shared";
import { NewsActionFields, TradeActionFields } from "./task-scheduler/action-fields";
import {
  ConditionalScheduleFields,
  FutureScheduleFields,
  LongTermScheduleFields,
  LoopScheduleFields,
  ShortTermScheduleFields,
} from "./task-scheduler/schedule-fields";
import { buildPayload } from "./task-scheduler/helpers";

export type TaskSchedulerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled?: (result: ScheduleTaskResponse) => void;
  defaultAgent?: string;
  defaultTeam?: string;
};

const BASE_DIALOG_MAX_WIDTH_PX = 896; // Tailwind max-w-4xl baseline (56rem)
const ADJUSTED_DIALOG_MAX_WIDTH_PX = Math.round(BASE_DIALOG_MAX_WIDTH_PX * 0.85);
const ADJUSTED_DIALOG_MAX_WIDTH_RULE = `min(${ADJUSTED_DIALOG_MAX_WIDTH_PX}px, calc(100vw - 2rem))`;

export function TaskSchedulerDialog({ open, onOpenChange, onScheduled, defaultAgent, defaultTeam }: TaskSchedulerDialogProps) {
  const { toast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const mutation = useScheduleTask();
  const form = useForm<TaskSchedulerFormValues>({
    resolver: taskSchedulerResolver,
    defaultValues: createDefaultValues({ agent: defaultAgent, team: defaultTeam }),
  });

  const scheduleType = form.watch("scheduleType");
  const actionType = form.watch("actionType");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "conditionalConditions" });

  const steps = useMemo(
    () => [
      {
        id: "details",
        label: "Details",
        description: "Name, owner, and context",
        fields: ["title", "agent", "team", "kind", "description"],
      },
      {
        id: "action",
        label: "Action",
        description: "What should run",
        fields: ["actionType", "actionPayload", "tradeInputs", "newsSources"],
      },
      {
        id: "schedule",
        label: "Schedule",
        description: "When to execute",
        fields: ["scheduleType", "schedule", "conditionalConditions", "loopEveryMs", "startAt", "endAt"],
      },
      {
        id: "review",
        label: "Review",
        description: "Confirm & submit",
        fields: [],
      },
    ],
    [],
  );

  const atFirstStep = stepIndex === 0;
  const atLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (open) {
      if (defaultAgent) {
        form.setValue("agent", defaultAgent);
      }
      if (defaultTeam) {
        form.setValue("team", defaultTeam);
      }
    }
  }, [defaultAgent, defaultTeam, open, form]);

  const handleSubmit = useCallback(
    async (values: TaskSchedulerFormValues) => {
      try {
        const payload = buildPayload(values);
        const result = await mutation.mutateAsync(payload);
        toast({
          title: "Task scheduled",
          description: `Created ${result.createdTaskIds.length} task${result.createdTaskIds.length === 1 ? "" : "s"}.`,
        });
        onScheduled?.(result);
        onOpenChange(false);
        form.reset({
          ...values,
          title: "",
          description: "",
          conditionalConditions: [],
        });
        setStepIndex(0);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Unable to schedule task",
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [form, mutation, onOpenChange, onScheduled, toast],
  );

  const handleNext = useCallback(async () => {
    const current = steps[stepIndex];
    const valid = await form.trigger(current.fields as (keyof TaskSchedulerFormValues)[]);
    if (!valid) return;
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [form, stepIndex, steps]);

  const handleBack = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const renderStepContent = () => {
    switch (steps[stepIndex].id) {
      case "details":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <SchedulerFormLabel>Task title</SchedulerFormLabel>
                    <FormControl>
                      <Input placeholder="Morning treasury rebalance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <SchedulerFormLabel>Task kind (optional)</SchedulerFormLabel>
                    <FormControl>
                      <Input placeholder="automation / research / trade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
              <FormField
                control={form.control}
                name="agent"
                render={({ field }) => (
                  <FormItem>
                    <SchedulerFormLabel>Agent</SchedulerFormLabel>
                    <FormControl>
                      <Input placeholder="Helios" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="team"
                render={({ field }) => (
                  <FormItem>
                    <SchedulerFormLabel>DAO</SchedulerFormLabel>
                    <FormControl>
                      <Input placeholder="Atlas DAO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <SchedulerFormLabel>Description</SchedulerFormLabel>
                  <FormControl>
                    <Textarea placeholder="What should the agent do?" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      case "action":
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="actionType"
              render={({ field }) => (
                <FormItem>
                  <SchedulerFormLabel>Action</SchedulerFormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full justify-between text-left text-regular">
                        <SelectValue placeholder="Select what to run" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {actionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-regular">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {actionType === "news_digest" && <NewsActionFields form={form} />}
            {actionType === "dex_trade" && <TradeActionFields form={form} />}
          </div>
        );
      case "schedule":
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="scheduleType"
              render={({ field }) => {
                const selectedOption = scheduleOptions.find((option) => option.value === field.value);
                return (
                  <FormItem>
                    <SchedulerFormLabel>Schedule type</SchedulerFormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full justify-between text-left text-regular">
                          <SelectValue placeholder="Choose schedule type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {scheduleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-regular">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedOption ? (
                      <p className="mt-2 text-xs text-muted-foreground text-regular">{selectedOption.description}</p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {scheduleType === "future" && <FutureScheduleFields form={form} />}
            {scheduleType === "short_term" && <ShortTermScheduleFields form={form} />}
            {scheduleType === "long_term" && <LongTermScheduleFields form={form} />}
            {scheduleType === "conditional" && (
              <ConditionalScheduleFields fields={fields} append={append} remove={remove} form={form} />
            )}
            {scheduleType === "loop" && <LoopScheduleFields form={form} />}
          </div>
        );
      case "review":
      default:
        return (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="text-base font-medium text-foreground">Review & confirm</p>
            <ul className="space-y-2">
              <li><strong>Title:</strong> {form.getValues("title") || "—"}</li>
              <li><strong>Agent:</strong> {form.getValues("agent") || "—"}</li>
              <li><strong>Team:</strong> {form.getValues("team") || "—"}</li>
              <li><strong>Action:</strong> {actionOptions.find((o) => o.value === form.getValues("actionType"))?.label ?? "—"}</li>
              <li><strong>Schedule:</strong> {scheduleOptions.find((o) => o.value === form.getValues("scheduleType"))?.label ?? "—"}</li>
            </ul>
            <p className="text-xs">If something looks off, go back and edit before scheduling.</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent
        className={cn(glassSurfaceClass, "w-full overflow-hidden text-regular sm:w-auto")}
        style={{
          ...glassSurfaceStyle,
          maxWidth: ADJUSTED_DIALOG_MAX_WIDTH_RULE,
          width: "min(100%, calc(100vw - 2rem))",
          maxHeight: "min(90vh, 880px)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-regular text-[#080808] dark:text-white">Schedule automation</DialogTitle>
          <DialogDescription className="text-regular text-sm text-muted-foreground">
            Plan ahead, run conditionally, or loop recurring agent workstreams.
          </DialogDescription>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex-1 rounded-full bg-muted">
              <div
                className="h-1 rounded-full bg-linear-to-r from-sky-500 via-sky-400 to-sky-200 transition-all"
                style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-foreground/80">Step {stepIndex + 1} of {steps.length}</span>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
            <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: "calc(80vh - 180px)" }}>
              {renderStepContent()}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <div className="text-xs text-muted-foreground">{steps[stepIndex].label} · {steps[stepIndex].description}</div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-regular"
                  onClick={atFirstStep ? () => onOpenChange(false) : handleBack}
                  disabled={mutation.isPending}
                >
                  {atFirstStep ? "Cancel" : "Back"}
                </Button>
                {atLastStep ? (
                  <Button type="submit" className="text-regular text-[#080808]" disabled={mutation.isPending}>
                    {mutation.isPending ? "Scheduling..." : "Schedule task"}
                  </Button>
                ) : (
                  <Button type="button" className="text-regular text-[#080808] dark:text-[#f4f4f4]" onClick={handleNext}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
