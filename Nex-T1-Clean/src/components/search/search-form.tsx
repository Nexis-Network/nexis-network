"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface SearchFormProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

const searchSchema = z.object({
  query: z.string().min(1, "Please enter a search query"),
});

export function SearchForm({ onSearch, isSearching }: SearchFormProps) {
  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { query: "" },
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input on initial load
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (values: z.infer<typeof searchSchema>) => {
    onSearch(values.query);
  };

  return (
    <Form {...form}>
      <form className="group w-full" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="flex w-full items-center space-x-2">
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem className="group relative flex-1">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground/50 transition-opacity group-focus-within:opacity-70" />
                <FormControl>
                  <Input
                    {...field}
                    className="h-11 rounded-md border-0 bg-muted/30 pl-10  transition-colors focus-visible:bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="latest tariff news..."
                    ref={inputRef}
                    type="text"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            className="h-11 px-4 font-normal text-xs  transition-all hover:bg-muted/30"
            disabled={isSearching || !form.watch("query").trim()}
            type="submit"
            variant="ghost"
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
