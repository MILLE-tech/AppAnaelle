import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ScoreChart } from "@/components/history/score-chart";

export default async function HistoriquePage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("review_sessions")
    .select("id, subject_id, session_type, total_questions, correct_count, started_at, finished_at, duration_seconds")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(30);

  const subjectIds = Array.from(
    new Set((sessions ?? []).map((s) => s.subject_id).filter((id): id is string => Boolean(id)))
  );

  const { data: subjects } =
    subjectIds.length > 0
      ? await supabase.from("subjects").select("id, name").in("id", subjectIds)
      : { data: [] };

  const subjectNames = Object.fromEntries((subjects ?? []).map((s) => [s.id, s.name]));

  const chronological = [...(sessions ?? [])].reverse();
  const chartPoints = chronological
    .filter((s) => s.total_questions > 0)
    .map((s) => ({
      percent: Math.round((s.correct_count / s.total_questions) * 100),
      label: new Date(s.started_at).toLocaleDateString("fr-FR"),
    }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Historique</h1>
      <p className="mt-1 text-muted">Tes dernières sessions de révision et ta progression.</p>

      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-medium text-muted">Progression du score</h2>
        <ScoreChart points={chartPoints} />
      </Card>

      <Card className="mt-4">
        {sessions && sessions.length > 0 ? (
          <ul className="divide-y divide-surface-border">
            {sessions.map((session) => {
              const percent =
                session.total_questions > 0
                  ? Math.round((session.correct_count / session.total_questions) * 100)
                  : 0;
              return (
                <li key={session.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {session.subject_id ? subjectNames[session.subject_id] ?? "Matière" : "Toutes matières"}
                      {session.session_type === "review_errors" && (
                        <span className="ml-2 text-xs text-muted">(erreurs)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(session.started_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {session.duration_seconds != null &&
                        ` · ${Math.round(session.duration_seconds / 60)} min`}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">
                    {session.correct_count}/{session.total_questions} · {percent}%
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Aucune session terminée pour l&apos;instant.</p>
        )}
      </Card>
    </div>
  );
}
