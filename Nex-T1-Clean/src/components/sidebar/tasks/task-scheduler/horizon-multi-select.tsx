"use client";

import { forwardRef, useCallback, useId, useMemo, useState, type ComponentProps } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
};

export type HorizonMultiSelectProps = {
  value?: string[];
  onChange: (nextValues: string[]) => void;
  options: ReadonlyArray<MultiSelectOption>;
  placeholder?: string;
  searchPlaceholder?: string;
} & Omit<ComponentProps<"button">, "onChange" | "value">;

export const HorizonMultiSelect = forwardRef<HTMLButtonElement, HorizonMultiSelectProps>(function HorizonMultiSelect(
  {
    value = [],
    onChange,
    options,
    placeholder = "Select horizons",
    searchPlaceholder = "Search horizons...",
    className,
    ...triggerProps
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const normalizedValues = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  const selectedOptions = useMemo(() => {
    const valueSet = new Set(normalizedValues);
    return options.filter((option) => valueSet.has(option.value));
  }, [normalizedValues, options]);

  const toggleValue = useCallback(
    (target: string) => {
      const next = new Set(normalizedValues);
      if (next.has(target)) {
        next.delete(target);
      } else {
        next.add(target);
      }
      onChange(Array.from(next));
    },
    [normalizedValues, onChange],
  );

  const displayText = useMemo(() => {
    if (!selectedOptions.length) {
      return placeholder;
    }
    if (selectedOptions.length === 1) {
      return selectedOptions[0]?.label ?? placeholder;
    }
    if (selectedOptions.length === 2) {
      return `${selectedOptions[0]?.label ?? ""}, ${selectedOptions[1]?.label ?? ""}`;
    }
    const remaining = selectedOptions.length - 2;
    return `${selectedOptions[0]?.label ?? ""}, ${selectedOptions[1]?.label ?? ""} +${remaining}`;
  }, [placeholder, selectedOptions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          {...triggerProps}
          className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between text-left text-regular", className)}
        >
          <span className={cn("truncate", selectedOptions.length ? "text-foreground" : "text-muted-foreground")}>
            {displayText}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList id={listId}>
            <CommandEmpty>No horizons found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = normalizedValues.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => toggleValue(option.value)}
                    className="text-regular"
                  >
                    <Check className={cn("mr-2 size-4", isSelected ? "opacity-100" : "opacity-0")} />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
