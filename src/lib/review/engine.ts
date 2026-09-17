"use client";

import type { createClient } from "@/lib/supabase/client";
import type { Database, SessionType } from "@/types/database.types";

type Supabase = ReturnType<typeof createClient>;
export type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

// Une question ouverte notée 8/10 ou plus est considérée comme "réussie"
// pour le suivi du paquet "à revoir" (seuil volontairement exigeant).
export const OPEN_CORRECT_THRESHOLD = 8;

export function isLocalAnswerCorrect(question: QuestionRow, answer: string): boolean {
  return answer === question.correct_answer;
}

export async function createReviewSession(
  supabase: Supabase,
  userId: string,
  subjectId: string | null,
  sessionType: SessionType
): Promise<string | null> {
  const { data, error } = await supabase
    .from("review_sessions")
    .insert({ user_id: userId, subject_id: subjectId, session_type: sessionType })
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id;
}

export async function finishReviewSession(
  supabase: Supabase,
  sessionId: string,
  totalQuestions: number,
  correctCount: number,
  durationSeconds: number
): Promise<void> {
  await supabase
    .from("review_sessions")
    .update({
      total_questions: totalQuestions,
      correct_count: correctCount,
      finished_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq("id", sessionId);
}

interface RecordAnswerParams {
  sessionId: string;
  question: QuestionRow;
  userId: string;
  userAnswer: string;
  isCorrect: boolean;
  score?: number | null;
  aiFeedback?: string | null;
}

export async function recordAnswer(supabase: Supabase, params: RecordAnswerParams): Promise<void> {
  const { sessionId, question, userId, userAnswer, isCorrect, score, aiFeedback } = params;

  await supabase.from("review_session_answers").insert({
    session_id: sessionId,
    question_id: question.id,
    user_id: userId,
    question_type: question.question_type,
    user_answer: userAnswer,
    is_correct: isCorrect,
    score: score ?? null,
    ai_feedback: aiFeedback ?? null,
  });

  await updateReviewState(supabase, {
    questionId: question.id,
    subjectId: question.subject_id,
    userId,
    isCorrect,
  });
}

interface UpdateReviewStateParams {
  questionId: string;
  subjectId: string;
  userId: string;
  isCorrect: boolean;
}

// Une question ratée rejoint le paquet "à revoir" ; elle en sort après deux
// bonnes réponses d'affilée.
async function updateReviewState(
  supabase: Supabase,
  { questionId, subjectId, userId, isCorrect }: UpdateReviewStateParams
): Promise<void> {
  const { data: existing } = await supabase
    .from("question_review_state")
    .select("*")
    .eq("question_id", questionId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (isCorrect) {
    const consecutive = (existing?.consecutive_correct ?? 0) + 1;
    const exitsReview = consecutive >= 2;
    await supabase.from("question_review_state").upsert(
      {
        question_id: questionId,
        subject_id: subjectId,
        user_id: userId,
        in_review: existing ? (exitsReview ? false : existing.in_review) : false,
        consecutive_correct: exitsReview ? 0 : consecutive,
        added_to_review_at: existing?.added_to_review_at ?? null,
        last_attempt_at: now,
      },
      { onConflict: "question_id" }
    );
  } else {
    await supabase.from("question_review_state").upsert(
      {
        question_id: questionId,
        subject_id: subjectId,
        user_id: userId,
        in_review: true,
        consecutive_correct: 0,
        added_to_review_at: existing?.added_to_review_at ?? now,
        last_attempt_at: now,
      },
      { onConflict: "question_id" }
    );
  }
}
