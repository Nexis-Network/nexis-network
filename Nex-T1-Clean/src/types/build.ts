export type FileType = 'file' | 'directory';

export interface VirtualFile {
    id: string;
    name: string;
    type: FileType;
    content?: string;
    parentId?: string;
    children?: VirtualFile[];
    language?: string;
    updatedAt: string;
}

export interface Project {
    updated_at: UntypedJson;
    id: string;
    name: string;
    description?: string;
    userId: string;
    files: VirtualFile[];
    createdAt: string;
    updatedAt: string;
}

export interface BuildState {
    projectId: string | null;
    projectName: string;
    files: VirtualFile[];
    activeFile: VirtualFile | null;
    projects: Project[];
    sandboxId: string | null;
    previewUrl: string | null;

    // Actions
    setProjectId: (id: string) => void;
    setProjectName: (name: string) => void;
    setFiles: (files: VirtualFile[]) => void;
    setActiveFile: (file: VirtualFile | null) => void;
    setProjects: (projects: Project[]) => void;
    setSandboxId: (id: string | null) => void;
    setPreviewUrl: (url: string | null) => void;

    // Async Actions
    fetchProjects: (signal?: AbortSignal) => Promise<void>;
    loadProject: (id: string) => Promise<void>;
    createProject: (name: string, description?: string) => Promise<string | null>;
    deleteProject: (id: string) => Promise<boolean>;
    renameProject: (id: string, name: string) => Promise<boolean>;

    // File Operations
    createFile: (name: string, type: FileType, parentId?: string) => Promise<void>;
    deleteFile: (fileId: string) => Promise<void>;
    renameFile: (fileId: string, newName: string) => Promise<void>;
    updateFileContent: (fileId: string, content: string) => Promise<void>;
}

export type Result<T, E = string> =
    | { success: true; data: T }
    | { success: false; error: E };
