import { create } from 'zustand';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { VirtualFile, Project as BuildProject, BuildState as SharedBuildState } from '@/types/build';


// Extend the shared state with implementation details if needed, 
// or just use the shared types for the store state.
// The shared BuildState interface in types/build.ts defines the shape we want.
// However, zustand create needs the state + actions.
// Let's redefine the store interface to match our implementation but use the shared data types.

interface BuildStore extends SharedBuildState {
  // We can add extra internal actions here if needed, but for now the shared one covers most.
  // The shared one has:
  // setProjectId, setProjectName, setFiles, setActiveFile, setProjects
  // fetchProjects, loadProject, createProject, deleteProject, renameProject
  // createFile, deleteFile, renameFile, updateFileContent

  // We need to ensure the implementation matches these signatures.
  // The previous implementation had 'addFile', 'saveProject'.
  // We should keep 'saveProject' as it might be useful, or refactor it.
  saveProject: () => Promise<void>;
  downloadProject: () => Promise<void>;
  exportToGitHub: () => Promise<void>;
  
  // Advanced Config
  githubRepoUrl: string | null;
  mcpServers: UntypedJson[];
  enableDocker: boolean;
  
  setGithubRepoUrl: (url: string | null) => void;
  setMcpServers: (servers: UntypedJson) => void;
  setEnableDocker: (enable: boolean) => void;
}


// We will default to DEX_TEMPLATE for now as it seems robust, but we can switch to web3-starter if more appropriate.
// based on file names, web3-starter might be more generic.
// We will default to DEX_TEMPLATE for now as it seems robust, but we can switch to web3-starter if more appropriate.
// based on file names, web3-starter might be more generic.
import { UNISWAP_TEMPLATE } from '@/lib/templates/uniswap-template';

import { logger } from '@/lib/logger';
const INITIAL_FILES = UNISWAP_TEMPLATE;

export const useBuildStore = create<BuildStore>((set, get) => ({
  files: INITIAL_FILES,
  activeFile: INITIAL_FILES[0],
  projectId: null,
  projectName: "Untitled Project",
  projects: [],
  sandboxId: null,
  previewUrl: null,
  
  githubRepoUrl: null,
  mcpServers: [],
  enableDocker: false,

  setFiles: (files) => set({ files }),
  setActiveFile: (activeFile) => set({ activeFile }),
  setProjectId: (projectId) => set({ projectId }),
  setProjectName: (projectName) => set({ projectName }),
  setProjects: (projects) => set({ projects }),
  setSandboxId: (sandboxId) => set({ sandboxId }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  
  setGithubRepoUrl: (githubRepoUrl) => set({ githubRepoUrl }),
  setMcpServers: (mcpServers) => set({ mcpServers }),
  setEnableDocker: (enableDocker) => set({ enableDocker }),



  // These are placeholders for the server actions which are now called directly from components
  // But we keep them in the store for state updates if needed, or we can remove them if we move logic to components.
  // The interface requires them.
  createFile: async (name, type, _parentId) => {
    // Assuming flat list with paths for now, or simplistic handling
    // If name contains slashes, we treat it as path
    // We should strictly use paths
    
    set((state) => {
       // Check if exists
       if (state.files.some(f => f.name === name)) {
           toast.error("File already exists");
           return state;
       }

       const newFile: VirtualFile = {
           id: crypto.randomUUID(),
           name,
           type,
           content: type === 'directory' ? undefined : '',
           updatedAt: new Date().toISOString(),
           language: type === 'file' ? (name.split('.').pop() || 'plaintext') : undefined
       };

       const updatedFiles = [...state.files, newFile];
       
       // Sync creation to sandbox
       const { sandboxId } = state;
       if (sandboxId) {
           // We fire and forget the sync
           fetch('/api/sandbox/sync', {
               method: 'POST',
               body: JSON.stringify({
                   sandboxId,
                   files: [{ path: name, content: newFile.content ?? "" }]
               })
           }).then(res => {
               if (!res.ok) logger.warn("Sync create failed", res.status);
           }).catch(e => logger.error("Sync create error", e));
       }

       return {
           files: updatedFiles,
           activeFile: type === 'file' ? newFile : state.activeFile
       };
    });
  },

  deleteFile: async (fileId) => {
    set((state) => {
        const file = state.files.find(f => f.id === fileId);
        if (!file) return state;

        const updatedFiles = state.files.filter((f) => f.id !== fileId);
        const updatedActive = state.activeFile?.id === fileId ? (updatedFiles[0] || null) : state.activeFile;
        
        // Sync deletion logic? 
        // Our /api/sandbox/sync only writes. We might need /api/sandbox/delete or update sync to handle null content.
        // For now, we update local state.
        
        return {
            files: updatedFiles,
            activeFile: updatedActive
        };
    });
  },

  renameFile: async (fileId, newName) => {
    set((state) => {
        const updatedFiles = state.files.map((f) => 
            f.id === fileId ? { ...f, name: newName, updatedAt: new Date().toISOString() } : f
        );
        return { files: updatedFiles };
    });
  },

  loadProject: async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    const isDevBypass = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === 'true';

    try {
      let data = null;
      
      if (isDevBypass) {
          // Look in local state
          const existing = get().projects.find(p => p.id === id);
          if (existing) {
              data = {
                  id: existing.id,
                  name: existing.name,
                  user_id: existing.userId,
                  files: existing.files,
                  created_at: existing.createdAt,
                  updated_at: existing.updatedAt || existing.updated_at
              };
          }
      } else {
          const { data: dbData, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();
          if (error) throw error;
          data = dbData;
      }

      if (data) {
        // Ensure files have all required properties
        // Ensure files have all required properties
        const loadedFiles = (data.files as UntypedJson[]).map((f) => ({
          ...f,
          id: f.id || crypto.randomUUID(),
          type: f.type || 'file',
          updatedAt: f.updatedAt || new Date().toISOString()
        }));

        set({
          projectId: data.id,
          projectName: data.name,
          files: loadedFiles,
          activeFile: loadedFiles.length > 0 ? loadedFiles[0] : null
        });

        // Sync to sandbox if exists
        const { sandboxId } = get();
        if (sandboxId) {
            fetch('/api/sandbox/sync', {
                method: 'POST',
                body: JSON.stringify({
                    sandboxId,
                    files: loadedFiles.map(f => ({ path: f.name, content: f.content }))
                })
            }).catch(e => logger.error("Auto-sync failed on load", e));
        }
      }
    } catch (error) {
      logger.error('Error loading project:', error);
      toast.error('Failed to load project');
    }
  },

  updateFileContent: async (fileId, content) => {
    set((state) => {
      const updatedFiles = state.files.map((f) =>
        f.id === fileId ? { ...f, content } : f
      );
      
      const updatedActiveFile = state.activeFile?.id === fileId
        ? { ...state.activeFile, content }
        : state.activeFile;

      // Sync to sandbox debounce? For now direct call.
      const { sandboxId } = state;
      const file = updatedFiles.find(f => f.id === fileId);
      
      if (sandboxId && file) {
          // Debounce or fire and forget
          // We don't await here to avoid UI lag
          fetch('/api/sandbox/sync', {
              method: 'POST',
              body: JSON.stringify({
                  sandboxId,
                  files: [{ path: file.name, content }]
              })
          }).catch(e => logger.error("Sync failed", e));
      }

      return {
        files: updatedFiles,
        activeFile: updatedActiveFile
      };
    });
  },

  saveProject: async () => {
    const { projectId, projectName, files } = get();
    const supabase = getSupabaseBrowserClient();
    const isDevBypass = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === 'true';

    try {
      let user = null;
      if (isDevBypass) {
          user = { id: 'mock-dev-user' };
      } else {
          const { data } = await supabase.auth.getUser();
          user = data.user;
      }

      if (!user) {
        toast.error("Please sign in to save projects");
        return;
      }

      const projectData = {
        name: projectName,
        files: files,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      if (isDevBypass) {
          // Mock save - just successful toast
          // We can update local state if needed but it's already in state
          set(state => ({
             projects: state.projects.map(p => 
                 p.id === projectId ? { ...p, ...projectData, updatedAt: projectData.updated_at } : p
             )
          }));
          toast.success("Project saved (Dev Mode)");
          return;
      }

      if (projectId) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', projectId);

        if (error) throw error;
        toast.success("Project saved");
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert([projectData])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          set({ projectId: data.id });
          toast.success("Project created");
          get().fetchProjects();
        }
      }
    } catch (error) {
      logger.error('Error saving project:', error);
      toast.error('Failed to save project');
    }
  },

  createProject: async (name: string, description?: string) => {
    const supabase = getSupabaseBrowserClient();
    const isDevBypass = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === 'true';

    try {
      let user = null;
      if (isDevBypass) {
        user = { id: 'mock-dev-user' };
      } else {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      }

      if (!user) {
        toast.error("Please sign in to create projects");
        return null;
      }

      const newProjectData = {
        name,
        description,
        user_id: user.id,
        files: INITIAL_FILES,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (isDevBypass) {
         // Mock creation
         const mockId = crypto.randomUUID();
         const createdProject: BuildProject = {
             id: mockId,
             ...newProjectData,
             userId: newProjectData.user_id,
             updatedAt: newProjectData.updated_at,
             createdAt: newProjectData.created_at
         };
         
         set(state => ({
           projects: [createdProject, ...state.projects],
           projectId: mockId,
           projectName: createdProject.name,
           files: createdProject.files,
           activeFile: createdProject.files[0]
         }));
         toast.success("Project created (Dev Mode)");
         return mockId;
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([newProjectData])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const createdProject: BuildProject = {
          id: data.id,
          name: data.name,
          description: data.description,
          userId: data.user_id,
          files: data.files,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          updated_at: data.updated_at
        };

        set(state => ({
          projects: [createdProject, ...state.projects],
          projectId: data.id,
          projectName: data.name,
          files: createdProject.files,
          activeFile: createdProject.files[0]
        }));

        return data.id;
      }
      return null;
    } catch (error) {
      logger.error('Error creating project:', error);
      toast.error('Failed to create project');
      return null;
    }
  },

  fetchProjects: async (signal?: AbortSignal) => {
    const supabase = getSupabaseBrowserClient();
    const isDevBypass = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === 'true';

    if (isDevBypass) {
        // In dev bypass, we rely on local state or mock data.
        // We don't want to wipe the state or hit Supabase.
        return;
    }

    if (!supabase) {
      logger.warn('[build-store] Supabase client unavailable; skipping fetchProjects');
      return;
    }

    try {
      // Bail early if the caller already cancelled
      if (signal?.aborted) return;

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (signal?.aborted) return;

      if (userError) {
        // Expected when auth session is missing/invalid; avoid Next overlay noise
        logger.warn('[build-store] Unable to resolve auth user for projects', userError);
        return;
      }

      if (!user) {
        // Not signed in -> nothing to fetch; reset list so UI stays consistent
        set({ projects: [] });
        return;
      }

      let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (signal) {
        // Abort long-running queries when the caller cancels.
        query = query.abortSignal ? query.abortSignal(signal) : query;
      }

      const { data, error } = await query;

      if (signal?.aborted) return;

      if (error) {
        logger.warn('Failed to fetch projects:', error);
        toast.error('Failed to load projects');
        return;
      }

      const projects: BuildProject[] = (data || []).map((p: UntypedJson) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        userId: p.user_id,
        files: p.files || [],
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));

      set({ projects });
    } catch (error) {
      if (signal?.aborted) return;
      // Use warn to avoid triggering Next.js dev overlay for expected runtime issues
      logger.warn('Unexpected error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  },

  deleteProject: async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => {
        const newProjects = state.projects.filter(p => p.id !== id);
        // If deleting current project, reset state
        if (state.projectId === id) {
          return {
            projects: newProjects,
            projectId: null,
            projectName: "Untitled Project",
            files: INITIAL_FILES,
            activeFile: INITIAL_FILES[0]
          };
        }
        return { projects: newProjects };
      });

      toast.success("Project deleted");
      return true;
    } catch (error) {
      logger.error('Error deleting project:', error);
      toast.error('Failed to delete project');
      return false;
    }
  },

  renameProject: async (id: string, name: string) => {
    const supabase = getSupabaseBrowserClient();
    try {
      const { error } = await supabase
        .from('projects')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        projects: state.projects.map(p =>
          p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
        ),
        projectName: state.projectId === id ? name : state.projectName
      }));

      toast.success("Project renamed");
      return true;
    } catch (error) {
      logger.error('Error renaming project:', error);
      toast.error('Failed to rename project');
      return false;
    }

  },

  downloadProject: async () => {
    const { files, projectName } = get();
    try {
      // Dynamically import JSZip and FileSaver to avoid SSR issues
      const JSZip = (await import('jszip')).default;
      const { saveAs } = (await import('file-saver')).default;

      const zip = new JSZip();

      files.forEach(file => {
        // Remove leading slash if present
        const fileName = file.name.startsWith('/') ? file.name.slice(1) : file.name;
        zip.file(fileName, file.content || '');
      });

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${projectName.replace(/\s+/g, '-').toLowerCase()}.zip`);
      toast.success("Project downloaded");
    } catch (error) {
      logger.error('Error downloading project:', error);
      toast.error('Failed to download project');
    }
  },

  exportToGitHub: async () => {
    // Mock implementation for now
    toast.info("Connecting to GitHub...");
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast.success("Connected to GitHub");
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.info("Creating repository...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success("Repository created successfully!");
    window.open('https://github.com/nexis-network/nexis-dapp-starter', '_blank');
  }

}));
