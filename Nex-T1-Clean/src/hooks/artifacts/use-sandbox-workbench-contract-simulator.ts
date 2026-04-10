"use client";

import { useCallback, useState } from "react";
import type { SmartContractFile } from "@/components/artifacts/workbench/workbench-smart-contract-tab";
import {
  simulatorId,
  type SimulatorEntry,
} from "@/components/artifacts/sandbox-workbench-utils";

type SimulatorEntryInput = Omit<SimulatorEntry, "createdAt" | "id">;

export function useSandboxWorkbenchContractSimulator() {
  const [contractFiles, setContractFiles] = useState<SmartContractFile[]>([]);
  const [selectedContractPath, setSelectedContractPath] = useState<
    string | null
  >(null);
  const [contractFramework, setContractFramework] = useState<string | null>(
    null,
  );
  const [contractChain, setContractChain] = useState<string | null>(null);
  const [contractCommands, setContractCommands] = useState<string[]>([]);
  const [simulatorEntries, setSimulatorEntries] = useState<SimulatorEntry[]>(
    [],
  );

  const appendSimulatorEntry = useCallback((entry: SimulatorEntryInput) => {
    setSimulatorEntries((previous) => [
      ...previous,
      {
        id: simulatorId(),
        createdAt: Date.now(),
        ...entry,
      },
    ]);
  }, []);

  const upsertContractFile = useCallback((entry: SmartContractFile) => {
    setContractFiles((previous) => {
      const next = previous.filter((file) => file.path !== entry.path);
      return [...next, entry].sort((left, right) =>
        left.path.localeCompare(right.path),
      );
    });
    setSelectedContractPath((current) => current ?? entry.path);
  }, []);

  return {
    appendSimulatorEntry,
    contractChain,
    contractCommands,
    contractFiles,
    contractFramework,
    hasContracts: contractFiles.length > 0,
    hasSimulator: simulatorEntries.length > 0,
    selectedContractPath,
    setContractChain,
    setContractCommands,
    setContractFiles,
    setContractFramework,
    setSelectedContractPath,
    setSimulatorEntries,
    simulatorEntries,
    upsertContractFile,
  };
}
