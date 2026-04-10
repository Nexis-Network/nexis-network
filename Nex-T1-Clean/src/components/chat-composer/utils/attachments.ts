import type { FileUIPart } from "ai";

import type { AttachmentItem } from "../use-attachments";

export async function attachmentsToFileUIParts(
  attachments: AttachmentItem[],
): Promise<FileUIPart[] | undefined> {
  if (!attachments.length) return undefined;

  return Promise.all(
    attachments.map(
      (attachment) =>
        new Promise<FileUIPart>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result !== "string") {
              reject(new Error("Unsupported attachment format"));
              return;
            }
            resolve({
              type: "file",
              url: reader.result,
              mediaType: attachment.file.type || "application/octet-stream",
              filename: attachment.file.name,
            });
          };
          reader.onerror = () => {
            reject(reader.error ?? new Error("Unable to read attachment"));
          };
          reader.readAsDataURL(attachment.file);
        }),
    ),
  );
}


