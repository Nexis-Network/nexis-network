import { useState, useRef, ChangeEvent } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSupabaseUpload } from "@/lib/hooks/storage/use-supabase-upload";
import { cn } from "@/lib/utils";


import { logger } from '@/lib/logger';
type AvatarUploaderProps = {
  children: React.ReactNode;
  className?: string;
  onUploadStart?: () => void;
  onUploadComplete?: (url: string) => void;
};

const DEFAULT_AVATAR_BUCKET = "avatars";

function getAvatarBucketName() {
  return process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET?.trim() || DEFAULT_AVATAR_BUCKET;
}

function resolveImageExtension(file: File) {
  if (file.type.includes("png")) return "png";
  if (file.type.includes("jpeg") || file.type.includes("jpg")) return "jpg";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("gif")) return "gif";

  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return "webp";
}

function generateObjectId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AvatarUploader({ 
  children, 
  className,
  onUploadStart,
  onUploadComplete 
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const bucketName = getAvatarBucketName();

  const { setFiles } = useSupabaseUpload({
    bucketName,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    upsert: true,
  });

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = selectedFiles[0];
    
    setFiles([{
      ...file,
      preview: URL.createObjectURL(file),
      errors: []
    }]); 
    
    setIsUploading(true);
    onUploadStart?.();
    
    try {
        const supabase = (await import("@/lib/supabase/client")).createClient();
        
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) throw new Error("User not found");
        
        const fileExt = resolveImageExtension(file);
        const filePath = `user-${userId}/${generateObjectId()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file, { upsert: true, contentType: file.type, cacheControl: "3600" });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);

        // Update profile via the PATCH endpoint (handles Redis cache invalidation)
        const patchRes = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ avatarUrl: publicUrl }),
        });
        if (!patchRes.ok) {
          const body = await patchRes.json().catch(() => null);
          throw new Error(body?.error ?? body?.message ?? `HTTP ${patchRes.status}`);
        }
        
        // Invalidate profile query to update UI immediately
        await queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
        
        toast.success("Avatar updated");
        onUploadComplete?.(publicUrl);

    } catch (error) {
        logger.error("Avatar upload failed", error);
        const message = error instanceof Error ? error.message : "Failed to upload avatar";
        if (message.toLowerCase().includes("bucket") && message.toLowerCase().includes("not found")) {
          toast.error(`Supabase bucket "${bucketName}" not found. Create it in Storage or set NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET.`);
        } else {
          toast.error(message);
        }
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const hiddenInput = (
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileSelect}
      className="hidden"
      accept="image/jpeg,image/png,image/webp,image/gif"
    />
  );

  return (
    <div className={cn("relative group cursor-pointer", className)} onClick={() => fileInputRef.current?.click()}>
      {children}
      {hiddenInput}
      
      {/* Overlay on hover */}
      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--auth-menu-bg)_60%,transparent)] opacity-0 transition-opacity group-hover:opacity-100">
        {isUploading ? (
            <Loader2 className="size-4 animate-spin text-[var(--auth-menu-fg)]" />
        ) : (
            <Upload className="size-4 text-[var(--auth-menu-fg)]" />
        )}
      </div>
    </div>
  );
}
