export type DocumentStatus =
  | "uploading"
  | "extracting"
  | "analyzing"
  | "ready"
  | "error";

export type ExtractionMethod = "pdf_text" | "pdf_vision" | "image_vision";

export type QuestionType = "true_false" | "mcq" | "open";

export type SessionType = "normal" | "review_errors";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          subject_id: string;
          user_id: string;
          file_name: string;
          mime_type: string;
          storage_path: string | null;
          keep_original: boolean;
          status: DocumentStatus;
          error_message: string | null;
          extraction_method: ExtractionMethod | null;
          extracted_text: string | null;
          page_count: number | null;
          char_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          user_id: string;
          file_name: string;
          mime_type: string;
          storage_path?: string | null;
          keep_original?: boolean;
          status?: DocumentStatus;
          error_message?: string | null;
          extraction_method?: ExtractionMethod | null;
          extracted_text?: string | null;
          page_count?: number | null;
          char_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          user_id?: string;
          file_name?: string;
          mime_type?: string;
          storage_path?: string | null;
          keep_original?: boolean;
          status?: DocumentStatus;
          error_message?: string | null;
          extraction_method?: ExtractionMethod | null;
          extracted_text?: string | null;
          page_count?: number | null;
          char_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      revision_sheets: {
        Row: {
          id: string;
          document_id: string;
          subject_id: string;
          user_id: string;
          title: string;
          content_markdown: string;
          model_used: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          subject_id: string;
          user_id: string;
          title: string;
          content_markdown: string;
          model_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          subject_id?: string;
          user_id?: string;
          title?: string;
          content_markdown?: string;
          model_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "revision_sheets_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: true;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revision_sheets_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      question_sets: {
        Row: {
          id: string;
          document_id: string;
          subject_id: string;
          user_id: string;
          question_type: QuestionType;
          requested_count: number;
          model_used: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          subject_id: string;
          user_id: string;
          question_type: QuestionType;
          requested_count: number;
          model_used?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          subject_id?: string;
          user_id?: string;
          question_type?: QuestionType;
          requested_count?: number;
          model_used?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_sets_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_sets_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          id: string;
          question_set_id: string;
          subject_id: string;
          user_id: string;
          question_type: QuestionType;
          prompt: string;
          options: string[] | null;
          correct_answer: string | null;
          explanation: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_set_id: string;
          subject_id: string;
          user_id: string;
          question_type: QuestionType;
          prompt: string;
          options?: string[] | null;
          correct_answer?: string | null;
          explanation?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_set_id?: string;
          subject_id?: string;
          user_id?: string;
          question_type?: QuestionType;
          prompt?: string;
          options?: string[] | null;
          correct_answer?: string | null;
          explanation?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_question_set_id_fkey";
            columns: ["question_set_id"];
            isOneToOne: false;
            referencedRelation: "question_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      question_review_state: {
        Row: {
          question_id: string;
          subject_id: string;
          user_id: string;
          in_review: boolean;
          consecutive_correct: number;
          added_to_review_at: string | null;
          last_attempt_at: string | null;
          updated_at: string;
        };
        Insert: {
          question_id: string;
          subject_id: string;
          user_id: string;
          in_review?: boolean;
          consecutive_correct?: number;
          added_to_review_at?: string | null;
          last_attempt_at?: string | null;
          updated_at?: string;
        };
        Update: {
          question_id?: string;
          subject_id?: string;
          user_id?: string;
          in_review?: boolean;
          consecutive_correct?: number;
          added_to_review_at?: string | null;
          last_attempt_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_review_state_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      review_sessions: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string | null;
          session_type: SessionType;
          total_questions: number;
          correct_count: number;
          started_at: string;
          finished_at: string | null;
          duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id?: string | null;
          session_type?: SessionType;
          total_questions?: number;
          correct_count?: number;
          started_at?: string;
          finished_at?: string | null;
          duration_seconds?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string | null;
          session_type?: SessionType;
          total_questions?: number;
          correct_count?: number;
          started_at?: string;
          finished_at?: string | null;
          duration_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "review_sessions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      review_session_answers: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          user_id: string;
          question_type: QuestionType;
          user_answer: string | null;
          is_correct: boolean;
          score: number | null;
          ai_feedback: string | null;
          answered_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          user_id: string;
          question_type: QuestionType;
          user_answer?: string | null;
          is_correct: boolean;
          score?: number | null;
          ai_feedback?: string | null;
          answered_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_id?: string;
          user_id?: string;
          question_type?: QuestionType;
          user_answer?: string | null;
          is_correct?: boolean;
          score?: number | null;
          ai_feedback?: string | null;
          answered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_session_answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "review_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_session_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          title: string;
          event_date: string;
          coefficient: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          title: string;
          event_date: string;
          coefficient?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string;
          title?: string;
          event_date?: string;
          coefficient?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
