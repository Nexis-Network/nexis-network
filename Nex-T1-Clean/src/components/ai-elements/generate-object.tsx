"use client";

import { Loader2, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateAgentIdeaAction } from "@/app/(marketing)/actions";
import type { AIAgent } from "@/lib/schema";
import { AgentOutputCard } from "@/components/agents/agent-output-card";


import { logger } from '@/lib/logger';
export function GenerateObject({
  agent,
  setAgent,
}: {
  agent: AIAgent | null;
  setAgent: (agent: AIAgent | null) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function generateIdea() {
    setIsLoading(true);
    try {
      const { object } = await generateAgentIdeaAction();
      setAgent(object);
    } catch (error) {
      logger.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-4xl overflow-hidden border-primary/10 border-t bg-linear-to-br from-background via-background to-background/80 backbackdrop-blur-lg transition-all duration-300 hover:shadow-lg dark:from-background dark:via-background/90 dark:to-background/70 dark:hover:shadow-lg/10">
      <CardContent className="p-4 sm:p-6 md:p-8">
        <AnimatePresence mode="wait">
          {agent ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key="agent-details"
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <AgentOutputCard agent={agent} className="mt-0" />
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="flex min-h-[400px] flex-col items-center justify-center text-center"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key="generate-button"
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <motion.h2
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 font-light text-3xl text-foreground tracking-tighter sm:text-2xl"
                initial={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Generate AI Agent Idea
              </motion.h2>
              <Button
                className="group relative overflow-hidden rounded-full px-8 font-medium transition-all hover:bg-primary/90 hover:shadow-md sm:px-10"
                disabled={isLoading}
                onClick={generateIdea}
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
                      Generate Object
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
                Click to generate a new AI agent concept and explore innovative
                possibilities
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
