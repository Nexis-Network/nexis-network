"use client";

import {
  ArtifactRuntimeProvider,
} from "@/lib/ai/artifact-runtime";
import { AppChatShellView } from "@/components/dashboard/app-chat-shell-view";

function AppChatShell() {
  return (
    <ArtifactRuntimeProvider>
      <AppChatShellView />
    </ArtifactRuntimeProvider>
  );
}

export { AppChatShell };
export default AppChatShell;
