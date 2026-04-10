"use client";

import { FileSpreadsheet } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { cn } from "@/lib/utils";
import {
  defaultCollaborations,
  IntroHeading,
} from "@/components/shared/branding/intro-heading";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { CodeInterpreterBlock } from "@/components/chat/message/code-interpreter-block";
import { SandboxPreview } from "@/components/chat/message/sandbox-preview";
import { DocumentCard } from "@/components/chat/document-card";
import { useTableEditorChat } from "./table-chat-provider";

import { logger } from "@/lib/logger";

function getRenderableMessageParts(message: {
  content?: string;
  parts?: Array<{
    type: string;
    text?: string;
    [key: string]: UntypedJson;
  }>;
}) {
  if (Array.isArray(message.parts) && message.parts.length > 0) {
    return message.parts;
  }

  if (typeof message.content === "string" && message.content.trim().length > 0) {
    return [{ type: "text", text: message.content }];
  }

  return [];
}

export function ChatMessageList() {
  const { messages, sendMessage, tableArtifact } = useTableEditorChat();
  const hasArtifactData = Boolean(tableArtifact?.data);

  return (
    <Conversation className="flex-1 min-h-0 w-full no-scrollbar relative">
      <ProgressiveBlur position="top" blurAmount="4px" height="150px" />
      <ProgressiveBlur position="bottom" blurAmount="4px" height="150px" />
      <ConversationContent>
        {messages.length === 0 && !hasArtifactData && (
          <div className="space-y-4">
            <IntroHeading
              collaborations={defaultCollaborations}
              subtitle="Chat with csv data artifact"
              title="CSV Table Artifact"
            />

            <Suggestions className="rounded-full bg-white p-1 md:bg-transparent md:p-0">
              <Suggestion
                className="text-xs"
                onClick={() => {
                  const exampleCSV = `Name,Department,Salary,Start Date,Performance Score
John Smith,Engineering,95000,2023-01-15,4.2
Sarah Johnson,Marketing,72000,2023-02-01,3.8
Mike Chen,Engineering,88000,2023-01-30,4.5
Emily Davis,Sales,65000,2023-03-10,3.9
David Wilson,Engineering,92000,2023-02-15,4.1
Lisa Brown,Marketing,68000,2023-03-05,3.7
Alex Rodriguez,Sales,71000,2023-01-20,4.0
Jennifer Lee,Engineering,87000,2023-02-28,4.3
Tom Anderson,Sales,63000,2023-03-15,3.6
Rachel Green,Marketing,75000,2023-01-10,4.1`;
                  sendMessage({ text: exampleCSV });
                }}
                suggestion="Load employee data with salary, department, and performance metrics"
              >
                <div className="flex items-center">
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                  Employee Data
                </div>
              </Suggestion>
              <Suggestion
                className="text-xs"
                onClick={() => {
                  const exampleCSV = `Product,Category,Price,Stock,Rating,Launch Date
iPhone 15,Electronics,999,150,4.8,2023-09-15
MacBook Pro,Electronics,1999,75,4.9,2023-10-30
Nike Air Max,Clothing,120,200,4.5,2023-01-10
Samsung Galaxy,Electronics,899,120,4.6,2023-08-20
Adidas Ultraboost,Clothing,180,180,4.4,2023-03-05
Dell XPS 13,Electronics,1299,90,4.7,2023-06-12
Levi's 501,Clothing,80,300,4.3,2023-02-14
Sony WH-1000XM5,Electronics,399,60,4.8,2023-05-08
Nike Dri-FIT,Clothing,25,500,4.2,2023-04-20
iPad Air,Electronics,599,110,4.7,2023-09-15`;
                  sendMessage({ text: exampleCSV });
                }}
                suggestion="Load product inventory with pricing, stock levels, and ratings"
              >
                <div className="flex items-center">
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                  Product Inventory
                </div>
              </Suggestion>
              <Suggestion
                className="text-xs"
                onClick={() => {
                  const exampleCSV = `City,Country,Population,Area (km²),GDP (Billion),Tourism Score
Tokyo,Japan,37400000,13572,1650,9.2
New York,USA,20100000,1214,1800,9.5
London,UK,9540000,1572,550,9.0
Paris,France,11000000,105,680,9.3
Sydney,Australia,5400000,12368,400,8.8
Singapore,Singapore,5450000,719,400,9.1
Dubai,UAE,3400000,4114,110,8.9
Barcelona,Spain,5500000,101,180,8.7
Amsterdam,Netherlands,1100000,219,90,8.6
Vancouver,Canada,2600000,115,120,8.5`;
                  sendMessage({ text: exampleCSV });
                }}
                suggestion="Load global cities data with population, area, and economic metrics"
              >
                <div className="flex items-center">
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                  Global Cities
                </div>
              </Suggestion>
              <Suggestion
                className="text-xs"
                onClick={() => {
                  const exampleCSV = `Student,Subject,Test 1,Test 2,Test 3,Final Grade,Attendance %
Alice Johnson,Mathematics,85,92,88,88,95
Bob Smith,Mathematics,78,85,82,82,88
Carol Davis,Mathematics,92,89,94,92,98
David Wilson,Mathematics,76,79,81,79,85
Emma Brown,Mathematics,88,91,87,89,92
Frank Miller,Mathematics,83,86,84,84,90
Grace Lee,Mathematics,90,93,91,91,96
Henry Taylor,Mathematics,81,84,83,83,87
Ivy Chen,Mathematics,87,90,86,88,94
Jack Anderson,Mathematics,79,82,80,80,86`;
                  sendMessage({ text: exampleCSV });
                }}
                suggestion="Load student grades with test scores, final grades, and attendance"
              >
                <div className="flex items-center">
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                  Student Grades
                </div>
              </Suggestion>
              <Suggestion
                className="text-xs"
                onClick={() => {
                  const exampleCSV = `Date,Revenue,Expenses,Profit,Orders,Customers
2024-01-01,125000,85000,40000,450,380
2024-01-02,132000,88000,44000,480,410
2024-01-03,118000,82000,36000,420,350
2024-01-04,145000,95000,50000,520,440
2024-01-05,128000,87000,41000,460,390
2024-01-06,139000,92000,47000,500,420
2024-01-07,121000,84000,37000,430,360
2024-01-08,147000,96000,51000,530,450
2024-01-09,134000,89000,45000,480,400
2024-01-10,142000,93000,49000,510,430`;
                  sendMessage({ text: exampleCSV });
                }}
                suggestion="Load daily sales data with revenue, expenses, and customer metrics"
              >
                <div className="flex items-center">
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                  Sales Data
                </div>
              </Suggestion>
            </Suggestions>
          </div>
        )}

        {messages.map((message) => (
          <Message from={message.role} key={message.id}>
            <MessageContent
              className={cn(message.role === "assistant" && "w-full")}
            >
              {getRenderableMessageParts(message).map((part, partIndex) => {
                if (part.type === "text") {
                  return (
                    <Response key={`${message.id}-part-${partIndex}`}>
                      {part.text}
                    </Response>
                  );
                }
                if (part.type === "data-artifact-table-editor") {
                  return (
                    <div
                      className="mt-2"
                      key={`${message.id}-part-${partIndex}`}
                    >
                      <div className="rounded-lg border bg-muted/50 p-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            <p className="font-medium text-sm">
                              Table editor ready
                            </p>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            Open the artifact to explore the editable
                            spreadsheet, summary, and AI operations.
                          </p>
                          <button
                            className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm transition hover:bg-primary/90"
                            onClick={() => {
                              logger.debug(
                                "Button clicked - dispatching openTableArtifact event",
                              );
                              const event = new CustomEvent(
                                "openTableArtifact",
                              );
                              window.dispatchEvent(event);
                              logger.debug("Event dispatched:", event);
                            }}
                            type="button"
                          >
                            Open table editor
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (part.type === "tool-invocation") {
                  const toolPart = part as unknown as {
                    toolInvocation: {
                      toolName: string;
                      args: Record<string, UntypedJson>;
                      result?: {
                        stdout: string;
                        stderr: string;
                        results?: UntypedJson[];
                        url?: string;
                        port?: number;
                      };
                    };
                  };
                  const { toolInvocation } = toolPart;
                  if (toolInvocation.toolName === "e2b_code_interpreter") {
                    const { code, language } = toolInvocation.args as {
                      code: string;
                      language: string;
                    };
                    const result =
                      "result" in toolInvocation
                        ? toolInvocation.result
                        : undefined;

                    return (
                      <CodeInterpreterBlock
                        key={`${message.id}-part-${partIndex}`}
                        code={code}
                        language={language}
                        result={result}
                        isLoading={!result}
                      />
                    );
                  }
                  if (toolInvocation.toolName === "e2b_get_preview_url") {
                    const result =
                      "result" in toolInvocation
                        ? toolInvocation.result
                        : undefined;
                    if (result?.url) {
                      return (
                        <SandboxPreview
                          key={`${message.id}-part-${partIndex}`}
                          url={result.url}
                          port={result.port}
                          isLoading={!result}
                        />
                      );
                    }
                  }
                }
                if (part.type === "data-createDocument") {
                  const documentPart = part as {
                    data?: { title?: string; status?: string };
                    id?: string;
                  };
                  const data = documentPart.data;
                  const status =
                    data?.status === "processing" ||
                    data?.status === "streaming" ||
                    data?.status === "success" ||
                    data?.status === "error"
                      ? data.status
                      : "processing";
                  return (
                    <div
                      className="mt-2"
                      key={`${message.id}-part-${partIndex}`}
                    >
                      <DocumentCard
                        title={data?.title || "Untitled Document"}
                        id={documentPart.id || `doc-${partIndex}`}
                        status={status}
                      />
                    </div>
                  );
                }
                return null;
              })}
            </MessageContent>
          </Message>
        ))}

        <StatusIndicator />
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

export function StatusIndicator() {
  const { status } = useTableEditorChat();

  if (status === "ready") {
    return null;
  }

  return (
    <div className="text-center text-muted-foreground text-sm">
      {status === "streaming" && "AI is thinking..."}
      {status === "submitted" && "Processing..."}
    </div>
  );
}
