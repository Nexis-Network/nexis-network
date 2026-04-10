export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DocumentType = "pdf" | "docx" | "txt";
export type DocumentStatus = "pending" | "processing" | "processed" | "error";
export type ProcessingTaskType = "extract" | "analyze" | "vectorize";
export type ProcessingTaskStatus = "pending" | "processing" | "processed" | "error";

export interface Database {
  public: {
    Tables: {
      doc_processor_documents: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          processed_at: string | null;
          title: string;
          description: string | null;
          file_path: string;
          file_type: DocumentType;
          file_size: number;
          mime_type: string;
          status: DocumentStatus;
          error: string | null;
          user_id: string;
          file_hash: string;
          extracted_text: string | null;
          metadata: Json | null;
          analysis: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          processed_at?: string | null;
          title: string;
          description?: string | null;
          file_path: string;
          file_type: DocumentType;
          file_size: number;
          mime_type: string;
          status?: DocumentStatus;
          error?: string | null;
          user_id: string;
          file_hash: string;
          extracted_text?: string | null;
          metadata?: Json | null;
          analysis?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          processed_at?: string | null;
          title?: string;
          description?: string | null;
          file_path?: string;
          file_type?: DocumentType;
          file_size?: number;
          mime_type?: string;
          status?: DocumentStatus;
          error?: string | null;
          user_id?: string;
          file_hash?: string;
          extracted_text?: string | null;
          metadata?: Json | null;
          analysis?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "doc_processor_documents_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      doc_processor_document_chunks: {
        Row: {
          id: string;
          created_at: string;
          document_id: string;
          chunk_index: number;
          content: string;
          token_count: number;
          embedding: number[] | null;
          page_number: number | null;
          heading: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          document_id: string;
          chunk_index: number;
          content: string;
          token_count: number;
          embedding?: number[] | null;
          page_number?: number | null;
          heading?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          document_id?: string;
          chunk_index?: number;
          content?: string;
          token_count?: number;
          embedding?: number[] | null;
          page_number?: number | null;
          heading?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "doc_processor_document_chunks_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "doc_processor_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      doc_processor_document_entities: {
        Row: {
          id: string;
          created_at: string;
          document_id: string;
          entity_type: string;
          entity_text: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          document_id: string;
          entity_type: string;
          entity_text: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          document_id?: string;
          entity_type?: string;
          entity_text?: string;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "doc_processor_document_entities_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "doc_processor_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      doc_processor_processing_tasks: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          document_id: string;
          task_type: ProcessingTaskType;
          status: ProcessingTaskStatus;
          error: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          document_id: string;
          task_type: ProcessingTaskType;
          status?: ProcessingTaskStatus;
          error?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          document_id?: string;
          task_type?: ProcessingTaskType;
          status?: ProcessingTaskStatus;
          error?: string | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "doc_processor_processing_tasks_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "doc_processor_documents";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      hybrid_search_documents: {
        Args: {
          query_text: string;
          query_embedding: number[];
          match_count?: number;
          full_text_weight?: number;
          semantic_weight?: number;
          rrf_k?: number;
        };
        Returns: {
          id: string;
          document_id: string;
          title: string;
          content: string;
          page_number: number | null;
          heading: string | null;
          combined_score: number;
        }[];
      };
    };
    Enums: {
      document_type: DocumentType;
      document_status: DocumentStatus;
      processing_task_type: ProcessingTaskType;
      processing_task_status: ProcessingTaskStatus;
    };
  };
}
