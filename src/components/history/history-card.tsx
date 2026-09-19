import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreChart } from "@/components/history/score-chart";
import type { HistoryData } from "@/lib/history/get-history";

interface HistoryCardProps {
  history: HistoryData;
  /** Masque la colonne "matière" quand on est déjà filtré sur une seule matière. */
  hideSubjectColumn?: boolean;
  emptyAction?: React.ReactNode;
}

export function HistoryCard({ history, hideSubjectColumn, emptyAction }: HistoryCardProps) {
  const { sessions, subjectNames, chartPoints } = history;

  return (
    <>
      <Card>
        <h2 className="mb-4 text-sm font-medium text-muted">Progression du score</h2>
        <ScoreChart points={chartPoints} />
      </Card>

      <Card className="mt-4">
        {sessions.length > 0 ? (
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
                      {!hideSubjectColumn &&
                        (session.subject_id ? subjectNames[session.subject_id] ?? "Matière" : "Toutes matières")}
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
          <EmptyState
            icon={<ChartIcon className="h-6 w-6" />}
            title="Aucune session terminée pour l'instant"
            description="Génère des questions puis lance une révision : ton score et ta progression s'afficheront ici."
            action={emptyAction}
          />
        )}
      </Card>
    </>
  );
}

export function HistoryEmptyLink() {
  return (
    <Link href="/matieres">
      <Button variant="secondary">Aller à mes matières</Button>
    </Link>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 19V5m0 14h14M9 16v-4m4 4V9m4 7v-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
