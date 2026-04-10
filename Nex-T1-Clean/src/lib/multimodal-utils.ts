export type Base64ContentBlock = {
  type: "image" | "file";
  data: string;
  mime_type: string;
  metadata?: {
    name?: string;
    filename?: string;
    size?: number;
    [key: string]: UntypedJson;
  };
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const commaIndex = reader.result.indexOf(",");
        resolve(commaIndex >= 0 ? reader.result.slice(commaIndex + 1) : reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export async function fileToContentBlock(file: File): Promise<Base64ContentBlock> {
  const data = await readFileAsDataUrl(file);
  const metadata = {
    name: file.name,
    filename: file.name,
    size: file.size,
  };

  if (file.type === "application/pdf") {
    return {
      type: "file",
      data,
      mime_type: file.type,
      metadata,
    };
  }

  return {
    type: "image",
    data,
    mime_type: file.type,
    metadata,
  };
}

