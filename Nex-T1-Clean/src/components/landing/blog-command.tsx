'use client';

import * as React from "react";
import { useRouter } from "next/navigation";

import { ArrowRight, Hexagon, Search } from "lucide-react";

import { useTranslations } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getBlogCommandCopy } from "@/modules/blog/i18n";

import type { Category, Post } from "@/types/post";

interface BlogCommandDialogProps {
  categories: Category[];
  posts: Post[];
}

export function BlogCommandDialog({ categories, posts }: BlogCommandDialogProps) {
  const [open, setOpen] = React.useState(false);
  const t = useTranslations("blog");
  const copy = getBlogCommandCopy(t);
  const router = useRouter();

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={copy.openAria}
        className="ring-foreground/6.5 rounded-full px-2.5"
      >
        <Search />
        <span className="mr-12 max-md:hidden">{copy.triggerLabel}</span>

        <div className="flex gap-1 max-md:hidden">
          {["⌘", "K"].map((key) => (
            <kbd
              key={key}
              className="bg-muted text-muted-foreground pointer-events-none inline-flex size-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium"
            >
              <span className="text-xs">{key}</span>
            </kbd>
          ))}
        </div>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="ring-background **:data-[slot=command]:bg-card rounded-xl ring-1"
      >
        <CommandInput placeholder={copy.inputPlaceholder} />
        <CommandList className="pb-1">
          <CommandEmpty>{copy.empty}</CommandEmpty>
          <CommandGroup heading={copy.categoriesHeading}>
            {categories.map((category) => (
              <CommandItem
                key={category.slug}
                onSelect={() => {
                  router.push(`/blog/category/${category.slug}`);
                  setOpen(false);
                }}
              >
                <Hexagon className="not-in-data-[selected=true]:opacity-50" />
                <span>{category.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={copy.postsHeading}>
            {posts.slice(0, 10).map((post) => (
              <CommandItem
                key={post.slug}
                onSelect={() => {
                  router.push(`/blog/${post.slug}`);
                  setOpen(false);
                }}
              >
                <ArrowRight className="not-in-data-[selected=true]:opacity-50" />
                <div className="flex flex-col">
                  <span className="line-clamp-1">{post.title}</span>
                  <span className="text-muted-foreground line-clamp-1 hidden text-xs">{post.description}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
