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
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
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
        Insert: Partial<Database["public"]["Tables"]["subjects"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Row"]>;
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
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          subject_id: string;
          user_id: string;
          file_name: string;
          mime_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
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
        Insert: Partial<
          Database["public"]["Tables"]["revision_sheets"]["Row"]
        > & {
          document_id: string;
          subject_id: string;
          user_id: string;
          title: string;
          content_markdown: string;
        };
        Update: Partial<Database["public"]["Tables"]["revision_sheets"]["Row"]>;
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
        Insert: Partial<
          Database["public"]["Tables"]["question_sets"]["Row"]
        > & {
          document_id: string;
          subject_id: string;
          user_id: string;
          question_type: QuestionType;
          requested_count: number;
        };
        Update: Partial<Database["public"]["Tables"]["question_sets"]["Row"]>;
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
        Insert: Partial<Database["public"]["Tables"]["questions"]["Row"]> & {
          question_set_id: string;
          subject_id: string;
          user_id: string;
          question_type: QuestionType;
          prompt: string;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Row"]>;
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
        Insert: Partial<
          Database["public"]["Tables"]["question_review_state"]["Row"]
        > & {
          question_id: string;
          subject_id: string;
          user_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["question_review_state"]["Row"]
        >;
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
        Insert: Partial<
          Database["public"]["Tables"]["review_sessions"]["Row"]
        > & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["review_sessions"]["Row"]>;
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
        Insert: Partial<
          Database["public"]["Tables"]["review_session_answers"]["Row"]
        > & {
          session_id: string;
          question_id: string;
          user_id: string;
          question_type: QuestionType;
          is_correct: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["review_session_answers"]["Row"]
        >;
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
        Insert: Partial<
          Database["public"]["Tables"]["calendar_events"]["Row"]
        > & {
          user_id: string;
          subject_id: string;
          title: string;
          event_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_events"]["Row"]>;
      };
    };
  };
}
