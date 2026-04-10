export type WorkingMemoryScope = "user" | "chat";

export type WorkingMemory = {
  content: string;
  updatedAt: Date;
};

export type WorkingMemoryProvider = {
  getWorkingMemory(params: {
    chatId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
  }): Promise<WorkingMemory | null>;
  updateWorkingMemory(params: {
    chatId?: string;
    userId?: string;
    scope: WorkingMemoryScope;
    content: string;
  }): Promise<void>;
};
