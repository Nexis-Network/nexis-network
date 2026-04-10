"use client";

import { AlertCircle, Check, FileText, Loader2, Upload, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { startAnalysis, startExtraction, uploadDocument } from "@/lib/document-processor/actions";
import type { Database } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { DocumentStatus } from "@/components/documents/document-status";


import { logger } from '@/lib/logger';
// Constants and Types
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
} as const;

const WORKFLOW_STAGES = [
  { key: "uploading", label: "Upload" },
  { key: "extracting", label: "Extract" },
  { key: "analyzing", label: "Analyze" },
] as const;

// Animation Variants
const animations = {
  fadeIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  },
  springTransition: {
    type: "spring",
    stiffness: 400,
    damping: 25,
    mass: 1,
  },
  quickSpring: {
    type: "spring",
    stiffness: 600,
    damping: 35,
    mass: 0.5,
  },
  easeTransition: {
    type: "keyframes",
    ease: [0.4, 0, 0.2, 1],
    duration: 0.5,
  },
  dragOverlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  dragContent: {
    initial: { scale: 0.9 },
    animate: { scale: 1 },
    exit: { scale: 0.9 },
  },
} as const;

type Document = Database["public"]["Tables"]["doc_processor_documents"]["Row"];
type ProcessingTask = Database["public"]["Tables"]["doc_processor_processing_tasks"]["Row"];

interface UploadState {
  status: "idle" | "loading" | "uploading" | "processing" | "extracting" | "analyzing" | "error" | "success";
  progress: number;
  fileName?: string;
  error?: string;
  document?: Document;
  tasks?: ProcessingTask[];
}

interface WorkflowStepProps {
  label: string;
  status: "upcoming" | "current" | "complete";
}

function WorkflowStep({ label, status }: WorkflowStepProps) {
  logger.debug("WorkflowStep", label, status);
  return (
    <motion.div className="flex flex-col items-center gap-2" layout="position" transition={animations.springTransition}>
      <motion.div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
          status === "upcoming" && "border-muted bg-background text-muted-foreground",
          status === "current" && "animate-pulse border-primary bg-primary/10 text-primary",
          status === "complete" && "border-primary bg-primary text-primary-foreground"
        )}
        layout="preserve-aspect"
        transition={animations.quickSpring}
      >
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            initial={{ scale: 0, rotate: -90 }}
            key={status}
            transition={animations.easeTransition}
          >
            {status === "complete" ? (
              <Check className="h-4 w-4" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-current" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <motion.span
        className={cn(
          "font-medium text-xs",
          status === "upcoming" && "text-muted-foreground",
          status === "current" && "text-primary",
          status === "complete" && "text-primary"
        )}
        layout="position"
        transition={animations.quickSpring}
      >
        {label}
      </motion.span>
    </motion.div>
  );
}

function WorkflowProgress({ currentStage }: { currentStage: UploadState["status"] }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex items-center gap-2"
      initial={{ opacity: 0, y: 20 }}
      transition={{ ...animations.springTransition, delay: 0.1 }}
    >
      {WORKFLOW_STAGES.map((stage, index) => (
        <motion.div className="flex items-center" key={stage.key} layout="position">
          {index > 0 && (
            <motion.div
              className={cn(
                "h-[2px] w-12",
                WORKFLOW_STAGES.findIndex((s) => s.key === currentStage) > index ? "bg-primary" : "bg-muted"
              )}
              layout="preserve-aspect"
              transition={animations.easeTransition}
            />
          )}
          <WorkflowStep
            label={stage.label}
            status={
              WORKFLOW_STAGES.findIndex((s) => s.key === currentStage) > index
                ? "complete"
                : currentStage === stage.key
                  ? "current"
                  : "upcoming"
            }
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

function StateContent({ state, children }: { state: UploadState["status"]; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate="animate"
        className="flex flex-col items-center justify-center space-y-4"
        exit="exit"
        initial="initial"
        key={state}
        transition={animations.quickSpring}
        variants={animations.fadeIn}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function FileSpread() {
  const icons = [
    { Icon: PdfFileIcon, color: "text-red-500/90", delay: 0 },
    { Icon: Txt01Icon, color: "text-blue-500/90", delay: 0.1 },
    { Icon: Doc01Icon, color: "text-green-500/90", delay: 0.2 },
  ];

  return (
    <motion.div
      animate={{ scale: 1, rotate: 0 }}
      className="group relative flex size-12 items-center justify-center"
      initial={{ scale: 0.5, rotate: -180 }}
      transition={animations.springTransition}
      whileHover={{ scale: 1.05 }}
    >
      {[30, 0, -30].map((rotation, index) => (
        <motion.div
          animate={{
            rotate: rotation,
            x: rotation / 0.8,
            y: Math.abs(rotation) * 0.3,
            opacity: 1,
            scale: 1,
          }}
          className="absolute"
          initial={{ rotate: 0, x: 0, opacity: 0, scale: 0.8 }}
          key={rotation}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            delay: icons[index].delay,
          }}
          whileHover={{
            scale: 1.1,
            transition: { duration: 0.2 },
          }}
        >
          {React.createElement(icons[index].Icon, {
            className: cn(
              "size-8 transition-transform duration-200",
              icons[index].color,
              "drop-shadow-sm hover:drop-shadow-md",
              "group-hover:animate-pulse"
            ),
          })}
        </motion.div>
      ))}
    </motion.div>
  );
}

function UploadIcon({ status }: { status: UploadState["status"] }) {
  const icon = (() => {
    switch (status) {
      case "idle":
        return <FileSpread />;
      case "loading":
        return <Loader2 className="size-7 animate-spin text-primary" />;
      case "uploading":
        return <FileAiIcon className="size-7" />;
      case "processing":
        return <FileAiIcon className="size-7" />;
      case "extracting":
        return <FileAiIcon className="size-7" />;
      case "analyzing":
        return <FileAiIcon className="size-7" />;
      case "error":
        return <AlertCircle className="size-7 text-destructive" />;
      case "success":
        return <FileText className="size-7 fill-green-300 stroke-green-600 text-primary" />;
    }
  })();

  return (
    <motion.div
      className={cn("rounded-full p-3", status === "error" && "bg-destructive/10")}
      {...(status === "idle" && { whileHover: { scale: 1.05 } })}
      {...(status === "success" && {
        initial: { scale: 0.5, rotate: -180 },
        animate: { scale: 1, rotate: 0 },
      })}
      transition={animations.springTransition}
    >
      {icon}
    </motion.div>
  );
}

function UploadStateMessage({
  status,
  fileName,
  error,
}: {
  status: UploadState["status"];
  fileName?: string;
  error?: string;
}) {
  switch (status) {
    case "idle":
      return (
        <>
          <h3 className="font-regular text-lg tracking-tight">Upload a document</h3>
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-muted-foreground text-sm">
              Drag and drop your file here, or{" "}
              <span className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline">browse</span>
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-muted-foreground/80 text-xs">
              <span>Supports</span>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-red-500/10 px-1.5 py-0.5 font-medium text-red-600 dark:text-red-400 shadow-sm border border-red-500/20">
                  PDF
                </span>
                <span className="rounded bg-sky-500/100/10 px-1.5 py-0.5 font-medium text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/20">
                  TXT
                </span>
                <span className="rounded bg-green-500/10 px-1.5 py-0.5 font-medium text-green-600 dark:text-green-400 shadow-sm border border-green-500/20">
                  DOCX
                </span>
              </div>
              <span>up to 2MB</span>
            </div>
          </div>
        </>
      );
    case "loading":
      return (
        <>
          <h3 className="font-medium">Loading...</h3>
          <p className="max-w-[16rem] text-muted-foreground text-sm">This may take a few minutes.</p>
        </>
      );
    case "uploading":
      return (
        <>
          <h3 className="font-medium">Uploading document...</h3>
          <p className="text-muted-foreground text-sm">{fileName}</p>
        </>
      );
    case "processing":
      return <h3 className="font-medium">Processing document...</h3>;
    case "extracting":
      return <h3 className="font-medium">Extracting content...</h3>;
    case "analyzing":
      return <h3 className="font-medium">AI Analysis...</h3>;
    case "error":
      return (
        <>
          <h3 className="font-medium text-destructive">Upload failed</h3>
          <p className="text-muted-foreground text-sm">{error}</p>
        </>
      );
    case "success":
      return (
        <>
          <h3 className="font-medium">Processing complete!</h3>
          <p className="text-muted-foreground text-sm">Your document has been processed successfully.</p>
        </>
      );
  }
}

export function UploadZoneWrapper() {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });

  const handleStatusUpdate = (document: Document, tasks: ProcessingTask[]) => {
    setUploadState((prev) => ({
      ...prev,
      document,
      tasks,
      status:
        document.status === "processing"
          ? "processing"
          : document.status === "error"
            ? "error"
            : document.status === "processed"
              ? "success"
              : prev.status,
    }));
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      try {
        // 1. Upload Stage
        setUploadState({
          status: "uploading",
          progress: 0,
          fileName: file.name,
        });

        const progressInterval = setInterval(() => {
          setUploadState((prev) => ({
            ...prev,
            progress: Math.min(prev.progress + 10, 90),
          }));
        }, 200);

        const formData = new FormData();
        formData.append("file", file);

        const uploadResult = await uploadDocument(formData);
        clearInterval(progressInterval);

        if (!uploadResult.success) {
          throw new Error(uploadResult.error);
        }

        // 2. Start Processing Stage
        setUploadState((prev) => ({
          ...prev,
          status: "processing",
          progress: Math.min(prev.progress + 10, 90),
          document: uploadResult.document,
          tasks: uploadResult.tasks,
        }));

        toast.success("Document uploaded successfully", {
          description: "Starting document processing...",
        });

        setUploadState((prev) => ({
          ...prev,
          status: "extracting",
          progress: Math.min(prev.progress + 10, 90),
          document: uploadResult.document,
          tasks: uploadResult.tasks,
        }));

        // 3. Start extraction
        const documentRecord = uploadResult.document as { id?: string };
        const extractResult = await startExtraction(documentRecord.id ?? "");
        if (!extractResult.success) {
          throw new Error(extractResult.error);
        }

        // 4. Start analysis
        logger.debug("[Extract] Triggering analysis pipeline...");
        setUploadState((prev) => ({
          ...prev,
          status: "analyzing",
          progress: 95,
          document: uploadResult.document,
          tasks: uploadResult.tasks,
        }));
        await startAnalysis(documentRecord.id ?? "");

        setUploadState((prev) => ({
          ...prev,
          status: "success",
          progress: 100,
          document: uploadResult.document,
          tasks: uploadResult.tasks,
        }));
        toast.success("Document uploaded successfully", {
          description: "Starting document processing...",
        });

        router.refresh();
      } catch (error) {
        setUploadState({
          status: "error",
          progress: 0,
          fileName: file.name,
          error: error instanceof Error ? error.message : "Failed to upload document",
        });

        toast.error("Upload failed", {
          description: error instanceof Error ? error.message : "Failed to upload document",
        });
      }
    },
    [router]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const isUploading = uploadState.status === "uploading";
  const isProcessing = ["processing", "extracting", "analyzing"].includes(uploadState.status);
  const isError = uploadState.status === "error";
  const isSuccess = uploadState.status === "success";

  return (
    <div className="relative rounded-[1.65rem] p-1 shadow-[0px_1px_1px_0px_rgba(0,_0,_0,_0.05),_0px_1px_1px_0px_rgba(255,_252,_240,_0.5)_inset,_0px_0px_0px_1px_hsla(0,_0%,_100%,_0.1)_inset,_0px_0px_1px_0px_rgba(28,_27,_26,_0.5)]">
      <div {...getRootProps()} className="relative">
        <motion.div
          className={cn(
            "relative cursor-pointer rounded-3xl border-[1px] border-border/50 shadow-inner transition-colors",
            isDragActive && !isDragReject && "border-primary/50 bg-primary/5",
            isDragReject && "border-yellow-500/30 bg-yellow-500/10",
            isError && "border-destructive/50 bg-destructive/5",
            (isUploading || isProcessing) && "border-blue-500/30 bg-sky-500/100/10",
            isSuccess && "border-green-500/50 bg-green-500/10",
            uploadState.status === "idle" && "group hover:border-primary/20 hover:bg-primary/[0.02]"
          )}
          layout="size"
          transition={animations.springTransition}
        >
          <input {...getInputProps()} />
          <motion.div
            className="relative flex flex-col items-center justify-center space-y-4 p-12 text-center"
            layout="position"
            transition={animations.quickSpring}
          >
            {/* Add subtle background pattern for idle state */}
            {uploadState.status === "idle" && (
              <div className="pointer-events-none absolute inset-0 select-none opacity-[0.03]">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                    backgroundSize: "40px 40px",
                  }}
                />
              </div>
            )}
            {(isUploading || isProcessing) && <WorkflowProgress currentStage={uploadState.status} />}

            <StateContent state={uploadState.status}>
              <UploadIcon status={uploadState.status} />

              <div className="space-y-2">
                <UploadStateMessage
                  error={uploadState.error}
                  fileName={uploadState.fileName}
                  status={uploadState.status}
                />
                {isProcessing && uploadState.document && uploadState.tasks && (
                  <DocumentStatus
                    document={uploadState.document}
                    onUpdate={handleStatusUpdate}
                    tasks={uploadState.tasks}
                  />
                )}
              </div>

              {isUploading && (
                <motion.div
                  animate={{ scaleX: 1 }}
                  className="w-full max-w-xs"
                  initial={{ scaleX: 0 }}
                  transition={animations.springTransition}
                >
                  <Progress className="h-1" value={uploadState.progress} />
                </motion.div>
              )}

              {isError && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadState({ status: "idle", progress: 0 });
                  }}
                  size="sm"
                  variant="outline"
                >
                  Try again
                </Button>
              )}
            </StateContent>
          </motion.div>

          {/* Drag Overlay */}
          <AnimatePresence>
            {isDragActive && (
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-background/80 backbackdrop-blur-lg"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  animate={{ scale: 1 }}
                  className="pointer-events-none flex items-center gap-2 font-medium"
                  exit={{ scale: 0.9 }}
                  initial={{ scale: 0.9 }}
                  transition={animations.springTransition}
                >
                  {isDragReject ? (
                    <>
                      <X className="h-5 w-5 text-destructive" />
                      <span className="text-destructive">Unsupported file type</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-primary" />
                      <span>Drop to upload</span>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export function Txt01Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill={"none"}
      height={24}
      viewBox="0 0 24 24"
      width={24}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9.49879 8.49792C5.89879 8.49792 3.5 9.5 3.5 12.1963V13H20.5V7.82643C20.5 6.13079 20.5 5.28297 20.232 4.60583C19.8012 3.51725 18.8902 2.65858 17.7352 2.25256C17.0168 2 16.1172 2 14.3182 2C13.9881 2 13.6753 2 13.3783 2.00051C9.49879 2.00051 10.5332 5.05948 10.5499 6.55167C10.5909 8.19467 9.8002 8.49792 9.49879 8.49792Z"
        fill="currentColor"
        opacity="0.4"
      />
      <path
        d="M3.5 13V12.1963C3.5 9.22892 3.5 7.74523 3.96894 6.56024C4.72281 4.65521 6.31714 3.15255 8.33836 2.44201C9.59563 2.00003 11.1698 2.00003 14.3182 2.00003C16.1173 2.00003 17.0168 2.00003 17.7352 2.25259C18.8902 2.65861 19.8012 3.51728 20.232 4.60587C20.5 5.283 20.5 6.13082 20.5 7.82646V12.0142V13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M3.5 12C3.5 10.1591 4.99238 8.66667 6.83333 8.66667C7.49912 8.66667 8.28404 8.78333 8.93137 8.60988C9.50652 8.45576 9.95576 8.00652 10.1099 7.43136C10.2833 6.78404 10.1667 5.99912 10.1667 5.33333C10.1667 3.49238 11.6591 2 13.5 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M10.1211 16L12.0034 19M12.0034 19L13.8858 22M12.0034 19L13.8858 16M12.0034 19L10.1211 22M16.7392 16H18.6216M18.6216 16H20.5039M18.6216 16V22M3.50391 16H5.38626M5.38626 16H7.26861M5.38626 16V22"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function PdfFileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill={"none"}
      height={24}
      viewBox="0 0 24 24"
      width={24}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12.8372 2.11303C12.5141 1.99902 12.1614 1.99902 11.4558 1.99902C8.21082 1.99902 6.58831 1.99902 5.48933 2.8851C5.26731 3.0641 5.06508 3.26634 4.88607 3.48835C4 4.58733 4 6.20984 4 9.45487V12.999H20V10.6559C20 9.83838 20 9.42963 19.8478 9.06208L19 8.99902C16.1716 8.99902 14.7574 8.99902 13.8787 8.12034C13 7.24166 13 5.82745 13 2.99902L12.8372 2.11303Z"
        fill="currentColor"
        opacity="0.4"
      />
      <path
        d="M20 13.001V10.6578C20 9.84033 20 9.43158 19.8478 9.06404C19.6955 8.69649 19.4065 8.40746 18.8284 7.8294L14.0919 3.09286C13.593 2.59397 13.3436 2.34453 13.0345 2.19672C12.9702 2.16598 12.9044 2.1387 12.8372 2.11499C12.5141 2.00098 12.1614 2.00098 11.4558 2.00098C8.21082 2.00098 6.58831 2.00098 5.48933 2.88705C5.26731 3.06606 5.06508 3.26829 4.88607 3.49031C4 4.58928 4 6.2118 4 9.45682V13.001M13 2.50098V3.00098C13 5.8294 13 7.24362 13.8787 8.1223C14.7574 9.00098 16.1716 9.00098 19 9.00098H19.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M19.75 16.001H17.25C16.6977 16.001 16.25 16.4487 16.25 17.001V19.001M16.25 19.001V22.001M16.25 19.001H19.25M4.25 22.001V19.501M4.25 19.501V16.001H6C6.9665 16.001 7.75 16.7845 7.75 17.751C7.75 18.7175 6.9665 19.501 6 19.501H4.25ZM10.25 16.001H11.75C12.8546 16.001 13.75 16.8964 13.75 18.001V20.001C13.75 21.1055 12.8546 22.001 11.75 22.001H10.25V16.001Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
function FileAiIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill={"none"}
      height={24}
      viewBox="0 0 24 24"
      width={24}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M10.0082 2H11C14.7712 2 16.6569 2 17.8284 3.17157C19 4.34315 19 6.22876 19 10V14C19 14.9185 19 15.7252 18.9831 16.437C18.3925 15.9112 17.926 15.2497 17.6298 14.4989L17.5931 14.4056C17.3808 13.8674 16.6192 13.8674 16.4069 14.4056L16.3702 14.4989C15.8518 15.8133 14.8113 16.8537 13.4969 17.3721L13.4036 17.4089C12.8655 17.6211 12.8655 18.3828 13.4036 18.595L13.4969 18.6318C14.8113 19.1502 15.8518 20.1906 16.3702 21.5051L16.4069 21.5983C16.4123 21.6119 16.418 21.6252 16.4241 21.6381C15.2353 22 13.5458 22 10.9938 22C7.2286 22 5.34602 22 4.17504 20.8319L4.16811 20.825C3 19.654 3 17.7714 3 14.0062V8.98648H4.00822C6.83665 8.98648 8.25087 8.98648 9.12955 8.1078C10.0082 7.22912 10.0082 5.8149 10.0082 2.98648V2Z"
        fill="currentColor"
        opacity="0.4"
      />
      <path
        d="M19 11.0032V10C19 6.22876 19 4.34315 17.8284 3.17157C16.6569 2 14.7712 2 11 2H10.0082L3 8.98648V14.0062C3 17.7714 3 19.654 4.16811 20.825L4.17504 20.8319C5.34602 22 7.2286 22 10.9938 22"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M3 9.00195H4C6.82843 9.00195 8.24264 9.00195 9.12132 8.12327C10 7.24459 10 5.83038 10 3.00195V2.00195"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M16.4069 21.5983C16.6192 22.1365 17.3808 22.1365 17.5931 21.5983L17.6298 21.5051C18.1482 20.1906 19.1887 19.1502 20.5031 18.6318L20.5964 18.595C21.1345 18.3828 21.1345 17.6211 20.5964 17.4089L20.5031 17.3721C19.1887 16.8537 18.1482 15.8133 17.6298 14.4989L17.5931 14.4056C17.3808 13.8674 16.6192 13.8674 16.4069 14.4056L16.3702 14.4989C15.8518 15.8133 14.8113 16.8537 13.4969 17.3721L13.4036 17.4089C12.8655 17.6211 12.8655 18.3828 13.4036 18.595L13.4969 18.6318C14.8113 19.1502 15.8518 20.1906 16.3702 21.5051L16.4069 21.5983Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export const Doc01Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    fill={"none"}
    height={24}
    viewBox="0 0 24 24"
    width={24}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M20.5007 17.2196C20.4486 16.0292 19.674 16 18.6231 16C17.0044 16 16.736 16.406 16.736 18V20C16.736 21.594 17.0044 22 18.6231 22C19.674 22 20.4486 21.9708 20.5007 20.7804M7.26568 19C7.26568 20.6569 6.00155 22 4.44215 22C4.0903 22 3.91437 22 3.78333 21.9196C3.46959 21.7272 3.50098 21.3376 3.50098 21V17C3.50098 16.6624 3.46959 16.2728 3.78333 16.0804C3.91437 16 4.0903 16 4.44215 16C6.00155 16 7.26568 17.3431 7.26568 19ZM12.0007 22C11.1134 22 10.6697 22 10.394 21.7071C10.1184 21.4142 10.1184 20.9428 10.1184 20V18C10.1184 17.0572 10.1184 16.5858 10.394 16.2929C10.6697 16 11.1134 16 12.0007 16C12.8881 16 13.3318 16 13.6074 16.2929C13.8831 16.5858 13.8831 17.0572 13.8831 18V20C13.8831 20.9428 13.8831 21.4142 13.6074 21.7071C13.3318 22 12.8881 22 12.0007 22Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
    <path
      d="M20 12.9999V10.6568C20 9.83929 20 9.43054 19.8478 9.063L19 8.99994C16.1716 8.99994 14.7574 8.99994 13.8787 8.12126C13 7.24258 13 5.82837 13 2.99994L13.0345 2.19568C12.7115 2.08168 12.1614 1.99994 11.4558 1.99994C8.21082 1.99994 6.58831 1.99994 5.48933 2.88601C5.26731 3.06502 5.06508 3.26725 4.88607 3.48927C4 4.58825 4 6.21076 4 9.45578V12.9999H20Z"
      fill="currentColor"
      opacity="0.4"
    />
    <path
      d="M20 12.9999V10.6568C20 9.83929 20 9.43054 19.8478 9.063C19.6955 8.69546 19.4065 8.40643 18.8284 7.82837L14.0919 3.09182C13.593 2.59294 13.3436 2.34349 13.0345 2.19568C12.9702 2.16494 12.9044 2.13766 12.8372 2.11395C12.5141 1.99994 12.1614 1.99994 11.4558 1.99994C8.21082 1.99994 6.58831 1.99994 5.48933 2.88601C5.26731 3.06502 5.06508 3.26725 4.88607 3.48927C4 4.58825 4 6.21076 4 9.45578V12.9999M13 2.49994V2.99994C13 5.82837 13 7.24258 13.8787 8.12126C14.7574 8.99994 16.1716 8.99994 19 8.99994H19.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);
