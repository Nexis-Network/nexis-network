"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { testAgent } from "@/app/(marketing)/actions";

import { useMediaQuery } from "@/hooks/ui";
import { agentTypes, examplePrompts } from "@/lib/types";
import { AgentHeader } from "./agent-header";
import { ActionButtons, InputPanel } from "./agent-input-panel";
import { MobileOutputPanel } from "./agent-mobile-output-panel";
import { OutputPanel } from "./agent-output-panel";


import { logger } from '@/lib/logger';
export function AgentSandbox() {
  // State Management
  const [inputs, setInputs] = useState<Record<string, string>>({}); // Stores user input fields
  const [selectedExampleIndex, setSelectedExampleIndex] = useState<number | null>(null); // Currently selected example index
  const [output, setOutput] = useState(""); // Raw output from the agent
  const [loading, setLoading] = useState(false); // Loading state during API calls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parsedOutput, setParsedOutput] = useState<Record<string, any> | null>(null); // Parsed JSON output if available
  const [selectedAgent, setSelectedAgent] = useState<
    (typeof agentTypes)[number]["id"]
  >(agentTypes[0].id); // Currently selected agent
  // const [params, setParams] = useState(initialParams); // AI model parameters
  const [inputHistory, setInputHistory] = useState<Record<string, string[]>>(
    {}
  ); // History of previous inputs by agent type
  const [outputDrawerOpen, setOutputDrawerOpen] = useState(false); // Mobile output drawer state

  // Responsive design hook for mobile detection
  const isMobile = useMediaQuery("(max-width: 768px)");
  const selectedAgentDetails = agentTypes.find(
    (agent) => agent.id === selectedAgent
  );

  // Get current agent's history
  const currentAgentHistory = inputHistory[selectedAgent] || [];

  /**
   * Updates a specific input field value
   * @param fieldName - The name of the input field
   * @param value - The new value for the field
   */
  const handleInputChange = (fieldName: string, value: string) => {
    setInputs((prev) => ({ ...prev, [fieldName]: value }));
  };

  /**
   * Resets all state variables to their initial values
   */
  const resetState = useCallback(() => {
    setInputs({});
    setOutput("");
    setLoading(false);
    setParsedOutput(null);
    // setParams(initialParams);
    setSelectedExampleIndex(null);
  }, []);

  /**
   * Handles agent type changes and resets state
   */
  const handleAgentChange = useCallback(
    (newAgent: (typeof agentTypes)[number]["id"]) => {
      setSelectedAgent(newAgent);
      resetState();
    },
    [resetState]
  );

  /**
   * Populates input fields with an example prompt
   */
  const handleExampleSelect = (example: Record<string, string>, index: number) => {
    setInputs(example);
    setSelectedExampleIndex(index);
  };

  /**
   * Loads a previous input configuration from history
   */
  const handleHistorySelect = (historyItem: string) => {
    try {
      const parsedItem = JSON.parse(historyItem) as Record<string, string>;
      setInputs(parsedItem);
      toast.success("Loaded from history");
    } catch {
      toast.error("Failed to load history item");
    }
  };

  /**
   * Utility functions for input management
   */
  const handleCopyInput = () => {
    navigator.clipboard.writeText(JSON.stringify(inputs, null, 2));
    toast.success("Copied to clipboard");
  };

  const handleClearInput = () => {
    setInputs({});
    toast.success("Input cleared");
  };

  /**
   * Processes the input and makes an API call to the selected agent
   * Handles the response and updates the UI accordingly
   */
  const handleInputSubmit = async () => {
    if (!selectedAgentDetails) return;

    if (Object.values(inputs).every((v) => v.trim() === "")) {
      toast.error("Please enter an input or select an example");
      return;
    }

    setLoading(true);
    setOutputDrawerOpen(true);

    try {
      const result = await testAgent(selectedAgent, inputs);
      setOutput(result);
      // Attempt to parse the output as JSON
      try {
        const parsed = JSON.parse(result) as Record<string, UntypedJson>;
        setParsedOutput(parsed);
        // If the parsed result contains an error flag, surface it
        if (parsed.error) {
          const errorMsg = typeof parsed.message === "string" ? parsed.message : "Unknown error";
          toast.error(errorMsg);
        }
      } catch {
        setParsedOutput(null);
      }
      // Add current input to agent-specific history
      setInputHistory((prev) => ({
        ...prev,
        [selectedAgent]: [
          JSON.stringify(inputs),
          ...(prev[selectedAgent] || []),
        ],
      }));
    } catch (error) {
      toast.error("Failed to process request");
      logger.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMobileReOpenOutputDrawer = () => {
    if (!outputDrawerOpen && parsedOutput) {
      setOutputDrawerOpen(true);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-x-hidden">
      {/* Header component with agent selection and input controls */}
      <AgentHeader
        agentTypes={agentTypes}
        hasInput={Object.values(inputs).some((v) => v.trim())}
        onAgentChange={handleAgentChange}
        onClearInput={handleClearInput}
        onCopyInput={handleCopyInput}
        selectedAgent={selectedAgent}
      />

      {/* Main content area with input and output panels */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted pb-4">
        <h2 className="hidden px-2 pt-4 font-medium text-[9px] text-neutral-400 sm:px-4 md:block">
          Input
        </h2>
        <div className="flex min-h-0 w-[calc(100vw-1rem)] flex-1 flex-col py-2 md:flex-row lg:w-full">
          {selectedAgentDetails && (
            <InputPanel
              examplePrompts={
                examplePrompts[selectedAgent as keyof typeof examplePrompts] ||
                []
              }
              inputs={inputs}
              onExampleSelect={handleExampleSelect}
              onInputChange={handleInputChange}
              resetState={resetState}
              selectedAgent={selectedAgentDetails}
              selectedExampleIndex={selectedExampleIndex ?? -1}
            >
              <ActionButtons
                handleHistorySelect={handleHistorySelect}
                handleInputSubmit={handleInputSubmit}
                inputHistory={currentAgentHistory}
                inputs={inputs}
                isMobile={isMobile}
                loading={loading}
                mobileReOpenOutputDrawer={handleMobileReOpenOutputDrawer}
                resetState={resetState}
              />
            </InputPanel>
          )}

          {/* Responsive Output Panel */}
          {isMobile ? (
            <MobileOutputPanel
              loading={loading}
              outputDrawerOpen={outputDrawerOpen}
              selectedAgent={selectedAgentDetails!}
              setOutputDrawerOpen={setOutputDrawerOpen}
            >
              <OutputPanel
                loading={loading}
                output={output}
                parsedOutput={parsedOutput}
                selectedAgent={selectedAgentDetails!}
              />
            </MobileOutputPanel>
          ) : (
            <OutputPanel
              loading={loading}
              output={output}
              parsedOutput={parsedOutput}
              selectedAgent={selectedAgentDetails!}
            />
          )}
        </div>
      </div>
    </div>
  );
}
