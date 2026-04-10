export interface Mem0Message {
  role: "user" | "assistant";
  content: string;
}

export interface Mem0AddParams {
  messages: Mem0Message[];
  userId: string;
  metadata?: Record<string, UntypedJson>;
}

export interface Mem0SearchParams {
  query: string;
  userId: string;
  limit?: number;
  user_id?: string;
  filters?: Record<string, UntypedJson>;
}

export type Mem0GetAllParams = {
  filters: Record<string, UntypedJson>;
  fields?: string[];
  page?: number;
  page_size?: number;
};

export interface Mem0Memory {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, UntypedJson>;
}

export type Mem0Config = {
  apiKey: string;
  projectId: string | null;
  baseUrl: string;
};

export type AddMemorySafeOptions = {
  category?: string;
  confidence?: number;
  minConfidence?: number;
  preventDuplicates?: boolean;
  metadata?: Record<string, UntypedJson>;
  allowSensitive?: boolean;
};

export type AddMemorySafeResult = {
  stored: boolean;
  reason?: string;
  event?: "created" | "updated";
  memoryId?: string;
};
