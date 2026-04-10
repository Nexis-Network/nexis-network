import {
  createArtifactScope,
  type ArtifactScope,
  type BaseContext,
} from "@/lib/ai/artifact-kit";

import type { ArtifactDataWithMetadata, ArtifactInstance } from "./types";

export type TableEditorContextState = BaseContext & {
  userId: string;
  fullName: string;
  currentArtifactData: ArtifactDataWithMetadata | null;
  currentArtifactInstance: ArtifactInstance | null;
};

export type TableEditorContextController = {
  scope: ArtifactScope<TableEditorContextState>;
  getContext: () => TableEditorContextState;
  getCurrentArtifactData: () => ArtifactDataWithMetadata | null;
  getCurrentArtifactInstance: () => ArtifactInstance | null;
  getCurrentUser: () => { id: string; fullName: string };
  setCurrentArtifactData: (data: ArtifactDataWithMetadata | null) => void;
  setCurrentArtifactInstance: (instance: ArtifactInstance | null) => void;
};

type TableEditorContextInit = BaseContext & {
  userId: string;
  fullName: string;
  currentArtifactData?: ArtifactDataWithMetadata | null;
  currentArtifactInstance?: ArtifactInstance | null;
};

export function createTableEditorContext(
  initialContext: TableEditorContextInit,
): TableEditorContextController {
  const scope = createArtifactScope({
    ...initialContext,
    currentArtifactData: initialContext.currentArtifactData ?? null,
    currentArtifactInstance: initialContext.currentArtifactInstance ?? null,
  });

  return {
    scope,
    getContext: scope.getContext,
    getCurrentArtifactData() {
      return scope.getContext().currentArtifactData ?? null;
    },
    getCurrentArtifactInstance() {
      return scope.getContext().currentArtifactInstance ?? null;
    },
    getCurrentUser() {
      const context = scope.getContext();
      return {
        id: context.userId,
        fullName: context.fullName,
      };
    },
    setCurrentArtifactData(data) {
      scope.updateContext((context) => {
        context.currentArtifactData = data;
      });
    },
    setCurrentArtifactInstance(instance) {
      scope.updateContext((context) => {
        context.currentArtifactInstance = instance;
      });
    },
  };
}
