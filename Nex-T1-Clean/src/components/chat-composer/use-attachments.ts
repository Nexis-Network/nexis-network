import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

export type AttachmentItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type UseAttachmentsReturn = {
  attachments: AttachmentItem[];
  handleAttachmentSelection: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  triggerAttachmentPicker: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
};

export function useAttachments(): UseAttachmentsReturn {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsRef = useRef<AttachmentItem[]>([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl);
      });
    };
  }, []);

  const clearFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleAttachmentSelection: UseAttachmentsReturn["handleAttachmentSelection"] = useCallback(
    (event) => {
      const files = event.currentTarget.files;
      if (!files || files.length === 0) {
        return;
      }

      const additions = Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setAttachments((prev) => prev.concat(additions));
      clearFileInput();
    },
    [clearFileInput],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      prev.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl);
      });
      return [];
    });
    clearFileInput();
  }, [clearFileInput]);

  const triggerAttachmentPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    attachments,
    handleAttachmentSelection,
    removeAttachment,
    clearAttachments,
    triggerAttachmentPicker,
    fileInputRef,
  };
}
