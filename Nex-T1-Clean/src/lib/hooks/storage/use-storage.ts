"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useCallback, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabaseClient";


import { logger } from '@/lib/logger';
export type RegisteredFile = {
  id: string;
  bucket: string;
  object_path: string;
  bytes: number;
  mime_type?: string | null;
  status: string;
  uploaded_at: string;
  last_scanned_at?: string | null;
};

type UploadOptions = {
  path?: string;
  labels?: Record<string, UntypedJson>;
  checksum?: string;
  prefix?: string;
};

export function useStorage(bucket: string) {
  const supabase = getSupabaseBrowserClient();
  const [isUploading, setUploading] = useState(false);
  const requireSupabase = () => {
    if (!supabase) {
      throw new Error("Supabase storage is not configured for this deployment");
    }
  };

  const listFiles = useCallback(async () => {
    requireSupabase();

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (process.env.NODE_ENV !== "production") {
          logger.warn("storage_session_fetch_failed", error);
        }
        return [] as RegisteredFile[];
      }

      if (!data.user) {
        return [] as RegisteredFile[];
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("/api/nex/me/storage", {
        credentials: "include",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (response.status === 401) {
        return [] as RegisteredFile[];
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(detail || "Failed to list storage files");
      }

      const payload = await response.json().catch(() => ({ files: [] }));
      return (payload.files ?? []) as RegisteredFile[];
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        logger.warn("storage_list_request_failed", error);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to list storage files");
    }
  }, [supabase]);

  const registerFile = useCallback(
    async (record: { path: string; bytes: number; mime_type?: string | null; labels?: Record<string, UntypedJson>; checksum?: string | null }) => {
      requireSupabase();

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      const response = await fetch("/api/nex/me/storage", {
        method: "POST",
        credentials: "include",
        headers: { 
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          bucket,
          path: record.path,
          bytes: record.bytes,
          mime_type: record.mime_type,
          labels: record.labels,
          checksum: record.checksum,
        }),
      });
      if (response.status === 401) {
        throw new Error("You need to be signed in to register storage metadata");
      }
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(detail || "Failed to register storage metadata");
      }
      const data = await response.json();
      return data.file as RegisteredFile;
    },
    [bucket],
  );

  const uploadFile = useCallback(
    async (file: File, options?: UploadOptions) => {
      requireSupabase();
      setUploading(true);
      try {
        const { data } = await supabase.auth.getUser();
        const supabaseUserId = data?.user?.id;
        const prefix = options?.prefix ?? (supabaseUserId ? `user-${supabaseUserId}` : "anonymous");
        const uniquePart = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now().toString(36);
        const path = options?.path ?? `${prefix}/${uniquePart}-${file.name}`;

        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: false,
        });
        if (error) throw error;

        return await registerFile({
          path,
          bytes: file.size,
          mime_type: file.type || null,
          labels: options?.labels,
          checksum: options?.checksum ?? null,
        });
      } finally {
        setUploading(false);
      }
    },
    [bucket, registerFile, supabase],
  );

  const createSignedUrl = useCallback(
    async (path: string, expiresIn = 60) => {
      requireSupabase();
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
    [bucket, supabase],
  );

  return {
    uploadFile,
    listFiles,
    createSignedUrl,
    isUploading,
  };
}
