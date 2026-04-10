"use client";

import { readStreamableValue } from "@/modules/ai/read-streamable-value";
import { Loader2, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { streamAgentIdeasAction } from "@/app/(marketing)/actions";
import type { AIAgent } from "@/lib/schema";


import { logger } from '@/lib/logger';
const tableRowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.3,
    },
  }),
  hover: {
    scale: 1.01,
    backgroundColor: "var(--hover-bg)",
    transition: { duration: 0.2 },
  },
};

export function StreamObjectArray({
  agents,
  setAgents,
}: {
  agents: AIAgent[];
  setAgents: (agents: AIAgent[]) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function generateIdeas() {
    setIsLoading(true);
    setAgents([]);
    try {
      const { array } = await streamAgentIdeasAction();
      const newAgents: AIAgent[] = [];
      for await (const agent of readStreamableValue(array)) {
        if (agent) {
          newAgents.push(agent as AIAgent);
          setAgents([...newAgents]);
        }
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
          {agents.length > 0 || isLoading ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              key="table"
              transition={{ duration: 0.5 }}
            >
              <motion.h2
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 font-light text-foreground text-xl tracking-tighter sm:text-2xl"
                initial={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                AI Agent Ideas
              </motion.h2>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">Name</TableHead>
                      <TableHead className="font-bold">Tagline</TableHead>
                      <TableHead className="font-bold">Use Case</TableHead>
                      <TableHead className="text-center font-bold">
                        Unique Value
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="wait">
                      {isLoading && agents.length === 0
                        ? Array.from({ length: 3 }).map((_, i) => (
                            <motion.tr
                              animate="visible"
                              className="[&>td]:p-4"
                              custom={i}
                              initial="hidden"
                              key={i}
                              variants={tableRowVariants}
                            >
                              <TableCell>
                                <Skeleton className="h-4 w-[150px]" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-[200px]" />
                              </TableCell>
                              <TableCell>
                                <Skeleton className="h-4 w-[150px]" />
                              </TableCell>
                              <TableCell className="text-center">
                                <Skeleton className="mx-auto h-4 w-[40px]" />
                              </TableCell>
                            </motion.tr>
                          ))
                        : agents.map((agent, i) => (
                            <motion.tr
                              animate="visible"
                              className="text-muted-foreground hover:text-primary [&>td]:p-4"
                              custom={i}
                              initial="hidden"
                              key={agent.name}
                              variants={tableRowVariants}
                              whileHover="hover"
                            >
                              <TableCell className="font-medium">
                                {agent.name}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <p className="text-sm">{agent.tagline}</p>
                              </TableCell>
                              <TableCell className="">
                                <span className="font-medium text-sm">
                                  {agent.useCase}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium text-sm">
                                  {agent.uniqueValue}
                                </span>
                              </TableCell>
                            </motion.tr>
                          ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="flex min-h-[400px] flex-col items-center justify-center text-center"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key="button"
              transition={{ duration: 0.4 }}
            >
              <motion.h2
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 font-light text-3xl text-foreground tracking-tighter sm:text-2xl"
                initial={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Generate AI Agent Ideas
              </motion.h2>
              <Button
                className="group relative overflow-hidden rounded-full px-8 font-medium transition-all hover:bg-primary/90 hover:shadow-md sm:px-10"
                disabled={isLoading}
                onClick={generateIdeas}
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
                      Stream Object Array
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
                Click to generate a list of innovative AI agent ideas
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
