"use client";

import { useEffect, useState } from "react";
import { Search, Brain, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";
import { TrashIcon } from "@/components/sidebar-03/animated-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { logger } from '@/lib/logger';
interface Memory {
  id: string;
  text: string;
  score?: number;
  metadata?: {
    category?: string;
    confidence?: number;
    extractedAt?: string;
  };
}

export default function MemoryManagementPage() {
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);

  useEffect(() => {
    loadMemories();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = memories.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()));
      setFilteredMemories(filtered);
    } else {
      setFilteredMemories(memories);
    }
  }, [searchQuery, memories]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/memory");
      if (!res.ok) throw new Error("Failed to load memories");
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (error) {
      logger.error("Failed to load memories:", error);
      toast.error("Failed to load memories");
    } finally {
      setLoading(false);
    }
  };

  const deleteOne = async (memoryId: string) => {
    try {
      const res = await fetch(`/api/memory?id=${memoryId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete memory");

      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      toast.success("Memory deleted");
    } catch (error) {
      logger.error("Failed to delete memory:", error);
      toast.error("Failed to delete memory");
    }
  };

  const deleteAll = async () => {
    try {
      const res = await fetch("/api/memory", {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to clear memories");

      setMemories([]);
      toast.success("All memories cleared");
    } catch (error) {
      logger.error("Failed to clear memories:", error);
      toast.error("Failed to clear memories");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--bento-text-muted)]" />
      </div>
    );
  }

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Memory Management"
        description="Nex remembers your preferences and past conversations to provide more personalized assistance."
        badge={<Brain className="h-5 w-5 text-[var(--settings-foreground-subtle)]" />}
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bento-text-muted)]" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={memories.length === 0} className="settings-destructive-button">
              <TrashIcon className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Memories?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all stored preferences and conversation context. Nex will no longer
                remember your past interactions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAll} className="settings-destructive-button">
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {filteredMemories.length === 0 ? (
        <BentoCard className="p-12 text-center">
          <Brain className="mx-auto h-12 w-12 text-[var(--bento-text-muted)] opacity-50" />
          <h3 className="mt-4 font-regular text-[var(--bento-text-primary)]">No memories stored</h3>
          <p className="text-sm text-[var(--bento-text-muted)] mt-1">
            {searchQuery
              ? "No memories match your search"
              : "Start chatting with Nex to build your personalized context"}
          </p>
        </BentoCard>
      ) : (
        <div className="space-y-3">
          {filteredMemories.map((memory) => (
            <BentoCard key={memory.id} className="p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-[var(--bento-text-primary)]">{memory.text}</p>

                  <div className="mt-2 flex items-center gap-2">
                    {memory.metadata?.category && (
                      <Badge variant="secondary" className="text-xs">
                        {memory.metadata.category}
                      </Badge>
                    )}
                    {memory.metadata?.confidence && (
                      <span className="text-xs text-[var(--bento-text-muted)]">
                        {Math.round(memory.metadata.confidence * 100)}% confidence
                      </span>
                    )}
                    {memory.metadata?.extractedAt && (
                      <span className="text-xs text-[var(--bento-text-muted)]">
                        {new Date(memory.metadata.extractedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <Button variant="ghost" size="sm" onClick={() => deleteOne(memory.id)}>
                  <TrashIcon className="h-4 w-4 text-[var(--settings-foreground-subtle)]" />
                </Button>
              </div>
            </BentoCard>
          ))}
        </div>
      )}

      <BentoCard className="border-[var(--settings-border)]/8 bg-[var(--settings-elevated)] p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--settings-foreground-subtle)]" />
          <div className="text-sm text-[var(--settings-foreground-muted)]">
            <p className="font-regular mb-1">Privacy Note</p>
            <p>
              Memories are stored securely and used only to personalize your experience. They are never shared with
              other users. You can delete individual memories or clear all at any time.
            </p>
          </div>
        </div>
      </BentoCard>
    </SettingsPage>
  );
}
