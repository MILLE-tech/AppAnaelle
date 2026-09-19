import { createClient } from "@/lib/supabase/server";
import type { SessionType } from "@/types/database.types";

export interface HistorySession {
  id: string;
  subject_id: string | null;
  session_type: SessionType;
  total_questions: number;
  correct_count: number;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
}

export interface HistoryData {
  sessions: HistorySession[];
  subjectNames: Record<string, string>;
  chartPoints: { percent: number; label: string }[];
}

// Historique des sessions terminées, optionnellement filtré sur une matière.
export async function getHistory(subjectId?: string): Promise<HistoryData> {
  const supabase = await createClient();

  let query = supabase
    .from("review_sessions")
    .select("id, subject_id, session_type, total_questions, correct_count, started_at, finished_at, duration_seconds")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(30);

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  const { data } = await query;
  const sessions = Array.isArray(data) ? data : [];

  const subjectIds = Array.from(
    new Set(sessions.map((s) => s.subject_id).filter((id): id is string => Boolean(id)))
  );

  const { data: subjectsData } =
    subjectIds.length > 0
      ? await supabase.from("subjects").select("id, name").in("id", subjectIds)
      : { data: [] };

  const subjectNames = Object.fromEntries((subjectsData ?? []).map((s) => [s.id, s.name]));

  const chronological = [...sessions].reverse();
  const chartPoints = chronological
    .filter((s) => s.total_questions > 0)
    .map((s) => ({
      percent: Math.round((s.correct_count / s.total_questions) * 100),
      label: new Date(s.started_at).toLocaleDateString("fr-FR"),
    }));

  return { sessions, subjectNames, chartPoints };
}
