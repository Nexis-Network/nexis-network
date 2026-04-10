"use client";

/**
 * Image Artifact Component
 * Displays generated or analyzed images
 */

import { memo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Expand, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";

type ImageArtifactPayload = {
  type: "image-artifact";
  url: string;
  prompt: string;
  revisedPrompt?: string;
};

type ImageArtifactProps = {
  payload: ImageArtifactPayload;
};

export const ImageArtifact = memo(function ImageArtifact({ payload }: ImageArtifactProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = payload.url;
    link.download = `generated-${Date.now()}.png`;
    link.click();
  };

  return (
    <>
    <Artifact className="my-4">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <div className="flex flex-col gap-0.5">
            <ArtifactTitle>Generated Image</ArtifactTitle>
            <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[300px]" title={payload.prompt}>{payload.prompt}</p>
          </div>
        </div>
        <ArtifactActions>
          <ArtifactAction icon={Expand} label="Expand" onClick={() => setIsExpanded(true)} />
          <ArtifactAction icon={Download} label="Download" onClick={handleDownload} />
        </ArtifactActions>
      </ArtifactHeader>

      <ArtifactContent className="p-0">
        <div className="relative flex min-h-[300px] w-full items-center justify-center bg-black/20 p-4">
          <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-lg shadow-sm">
            <Image
              src={payload.url}
              alt={payload.prompt}
              fill
              className="object-contain"
              onLoad={() => setIsLoading(false)}
              priority
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <div className="size-8 animate-spin rounded-full border-2 border-border border-t-transparent" />
              </div>
            )}
          </div>
        </div>
        {payload.revisedPrompt && payload.revisedPrompt !== payload.prompt && (
          <div className="border-t border-white/5 bg-white/[0.02] p-3">
             <p className="text-[10px] text-muted-foreground/70 italic">
               Revised: {payload.revisedPrompt}
             </p>
          </div>
        )}
      </ArtifactContent>
    </Artifact>

      {/* Expanded view dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Generated Image</DialogTitle>
            <DialogDescription>{payload.prompt}</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-square w-full">
            <Image
              src={payload.url}
              alt={payload.prompt}
              fill
              className="object-contain rounded-lg"
              priority
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="size-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

