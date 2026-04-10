import type {
    CodeEditorProps,
    PreviewProps,
    SandpackLayoutProps,
    SandpackProviderProps,
} from '@codesandbox/sandpack-react';
import type { ComponentProps } from 'react';
import { SandpackConsole, SandpackFileExplorer } from '@codesandbox/sandpack-react';

export type SandboxProviderProps = SandpackProviderProps;
export type SandboxLayoutProps = SandpackLayoutProps;

import type { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export type SandboxTabsProps = ComponentProps<typeof Tabs>;
export type SandboxTabsListProps = ComponentProps<typeof TabsList>;
export type SandboxTabsTriggerProps = ComponentProps<typeof TabsTrigger>;
export type SandboxTabsContentProps = ComponentProps<typeof TabsContent>;

export type SandboxCodeEditorProps = CodeEditorProps;
export type SandboxConsoleProps = Parameters<typeof SandpackConsole>[0];
export type SandboxPreviewProps = PreviewProps & {
    className?: string;
};
export type SandboxFileExplorerProps = ComponentProps<
    typeof SandpackFileExplorer
>;
