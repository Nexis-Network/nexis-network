"use client";

import { Loader2, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { streamTextAction } from "@/app/(marketing)/actions";
import { readStreamableValue } from "@/modules/ai/read-streamable-value";


import { logger } from '@/lib/logger';
export function StreamingText({
  generation,
  setGeneration,
}: {
  generation: string;
  setGeneration: (generation: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function startStreaming() {
    setIsLoading(true);
    setGeneration("");
    try {
      const { output } = await streamTextAction();
      let currentText = "";
      for await (const chunk of readStreamableValue(output)) {
        if (typeof chunk !== "string" || chunk.length === 0) continue;
        if (chunk.startsWith(currentText)) {
          currentText = chunk;
        } else if (currentText.startsWith(chunk)) {
          continue;
        } else {
          currentText += chunk;
        }
        setGeneration(currentText);
      }
    } catch (error) {
      logger.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-4xl overflow-hidden border-primary/10 border-t bg-linear-to-br from-background via-background to-background/80 backbackdrop-blur-lg transition-all duration-300 hover:shadow-lg dark:from-background dark:via-background/90 dark:to-background/70 dark:hover:shadow-2xl/10">
      <CardContent className="p-4 sm:p-6 md:p-8">
        <AnimatePresence mode="wait">
          {generation ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key="generation"
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <motion.h2
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 font-light text-foreground text-xl tracking-tighter sm:text-2xl"
                initial={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                AI Agent Use Cases
              </motion.h2>
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="prose prose-sm lg:prose-lg prose-neutral dark:prose-invert max-w-none"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Markdown>{generation}</Markdown>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="flex min-h-[400px] flex-col items-center justify-center text-center"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key="button"
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <motion.h2
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 font-light text-3xl text-foreground tracking-tighter sm:text-2xl"
                initial={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Generate AI Agent Use Cases
              </motion.h2>
              <Button
                className="group relative overflow-hidden rounded-full px-8 font-medium transition-all hover:bg-primary/90 hover:shadow-md sm:px-10"
                disabled={isLoading}
                onClick={startStreaming}
              >
                <motion.div
                  animate={{ opacity: isLoading ? 1 : 0 }}
                  className="absolute inset-0 bg-linear-to-r from-primary to-neutral-900 opacity-0 transition-opacity group-hover:opacity-100"
                  initial={false}
                />
                <motion.div
                  animate={{ x: isLoading ? -20 : 0 }}
                  className="relative z-10 flex items-center gap-3"
                  initial={false}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4 fill-primary" />
                      Stream Text
                    </>
                  )}
                </motion.div>
              </Button>
              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 max-w-sm text-muted-foreground text-sm"
                initial={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Click to generate AI agent use cases and explore innovative
                applications
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
