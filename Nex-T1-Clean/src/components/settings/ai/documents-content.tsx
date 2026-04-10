"use client";

import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { BentoCard } from "@/components/settings/shared/bento-card";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileIcon, TrashIcon } from "@/components/sidebar-03/animated-icons";
import { SettingsPage, SettingsPageHeader } from "@/components/settings-v2/primitives/page";

import { logger } from '@/lib/logger';
interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  status: "pending" | "processing" | "processed" | "failed";
  category: string;
  tags: string[];
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await fetch("/api/documents/upload");
      if (!res.ok) throw new Error("Failed to load documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      logger.error("Failed to load documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowed = ["application/pdf", "text/plain", "text/markdown"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file type. Please upload PDF, text, or markdown files.");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size: 10MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "general");
      formData.append("tags", JSON.stringify([]));

      // Simulate progress (actual upload doesn't support progress events via fetch)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await res.json();

      toast.success(`Uploaded ${file.name}`);

      // Add to documents list
      setDocuments((prev) => [
        {
          id: result.documentId,
          title: result.fileName,
          file_type: file.type,
          file_size: result.fileSize,
          status: "processing",
          category: "general",
          tags: [],
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Reset input
      e.target.value = "";
    } catch (error) {
      logger.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const handleDelete = async (documentId: string) => {
    try {
      const res = await fetch(`/api/documents/upload?id=${documentId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      toast.success("Document deleted");
    } catch (error) {
      logger.error("Delete error:", error);
      toast.error("Failed to delete document");
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
        title="Document Library"
        description="Upload documents to build your personalized knowledge base."
      />

      <BentoCard className="p-6">
        <Label htmlFor="file-upload" className="text-base font-regular mb-4 block text-[var(--bento-text-primary)]">
          Upload Document
        </Label>

        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-[var(--bento-border)] p-8 text-center transition-colors hover:border-white/20">
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <Label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <div className="h-12 w-12 rounded-full bg-white/[0.03] flex items-center justify-center">
                <Upload className="h-6 w-6 text-[var(--bento-text-muted)]" />
              </div>
              <div>
                <p className="font-medium text-sm text-[var(--bento-text-primary)]">Click to upload or drag and drop</p>
                <p className="text-xs text-[var(--bento-text-muted)] mt-1">
                  PDF, TXT, or Markdown (Max 10MB)
                </p>
              </div>
            </Label>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--bento-text-muted)]">Uploading...</span>
                <span className="font-mono text-[var(--bento-text-muted)]">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>
      </BentoCard>

      <div className="space-y-3">
        <h2 className="font-regular text-[var(--bento-text-primary)]">Your Documents ({documents.length})</h2>

        {documents.length === 0 ? (
          <BentoCard className="p-12 text-center">
            <FileIcon className="mx-auto h-12 w-12 text-[var(--bento-text-muted)] opacity-50" />
            <h3 className="mt-4 font-regular text-[var(--bento-text-primary)]">No documents yet</h3>
            <p className="text-sm text-[var(--bento-text-muted)] mt-1">
              Upload your first document to start building your knowledge base
            </p>
          </BentoCard>
        ) : (
          documents.map((doc) => (
            <BentoCard key={doc.id} className="p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileIcon className="h-5 w-5 text-[var(--settings-foreground-subtle)]" />
                    <h3 className="font-medium text-[var(--bento-text-primary)]">{doc.title}</h3>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {doc.category}
                    </Badge>
                    <StatusBadge status={doc.status} />
                    <span className="text-xs text-[var(--bento-text-muted)]">
                      {(doc.file_size / 1024).toFixed(0)} KB
                    </span>
                    <span className="text-xs text-[var(--bento-text-muted)]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {doc.tags.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {doc.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  disabled={doc.status === "processing"}
                >
                  <TrashIcon className="h-4 w-4 text-[var(--settings-foreground-subtle)]" />
                </Button>
              </div>
            </BentoCard>
          ))
        )}
      </div>
    </SettingsPage>
  );
}

function StatusBadge({ status }: { status: Document["status"] }) {
  switch (status) {
    case "processed":
      return (
        <Badge variant="default" className="border border-emerald-500/20 bg-emerald-500/12 text-xs text-emerald-100">
          <CheckCircle className="mr-1 h-3 w-3" />
          Ready
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="border border-red-500/20 bg-red-500/12 text-xs text-red-100">
          <AlertCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          Pending
        </Badge>
      );
  }
}
