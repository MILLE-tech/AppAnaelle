import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  const today = new Date().toISOString().slice(0, 10);
  const { data: nextEvent } = await supabase
    .from("calendar_events")
    .select("id, subject_id, title, event_date, coefficient")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const subjectId = nextEvent?.subject_id;
  const { data: nextEventSubject } = subjectId
    ? await supabase.from("subjects").select("id, name, color").eq("id", subjectId).single()
    : { data: null };

  const { count: reviewCount } = await supabase
    .from("question_review_state")
    .select("question_id", { count: "exact", head: true })
    .eq("in_review", true);

  const { data: subjectsData } = await supabase
    .from("subjects")
    .select("id, name, color")
    .order("created_at", { ascending: false })
    .limit(8);
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-semibold">
        Salut{firstName ? ` ${firstName}` : ""} 👋
      </h1>
      <p className="mt-1 text-muted">Prête à réviser aujourd&apos;hui ?</p>

      {subjects.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            icon={<SparkleIcon className="h-6 w-6" />}
            title="Bienvenue sur AppAnaelle !"
            description="Crée ta première matière, ajoute un cours en PDF ou en photo, et génère automatiquement fiches et quiz pour réviser."
            action={
              <Link href="/matieres">
                <Button>Créer ma première matière</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {nextEvent && nextEventSubject ? (
            <Card className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Prochaine évaluation
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: nextEventSubject.color }}
                    />
                    <p className="text-xl font-semibold">
                      {nextEventSubject.name} — {nextEvent.title}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {(() => {
                      const days = daysUntil(nextEvent.event_date);
                      if (days === 0) return "C'est aujourd'hui !";
                      if (days === 1) return "Demain";
                      return `Dans ${days} jours`;
                    })()}
                    {nextEvent.coefficient != null && ` · coefficient ${nextEvent.coefficient}`}
                  </p>
                </div>
                <Link href={`/matieres/${nextEventSubject.id}`}>
                  <Button variant="secondary">Réviser cette matière</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="mt-6">
              <EmptyState
                icon={<CalendarIcon className="h-6 w-6" />}
                title="Aucune évaluation à venir"
                description="Ajoute la date de ton prochain contrôle pour voir le compte à rebours ici."
                action={
                  <Link href="/calendrier">
                    <Button variant="secondary">
                      <PlusIcon className="h-4 w-4" /> Ajouter une évaluation
                    </Button>
                  </Link>
                }
              />
            </Card>
          )}

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-muted">Mes matières</p>
              <Link href="/matieres" className="text-xs text-accent hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <Link
                  key={subject.id}
                  href={`/matieres/${subject.id}`}
                  className="glass-card inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  {subject.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <p className="text-sm font-medium text-muted">Questions à revoir</p>
              <p className="mt-1 text-3xl font-semibold">{reviewCount ?? 0}</p>
              {!!reviewCount && (
                <Link href="/reviser/erreurs" className="mt-3 inline-block">
                  <Button variant="secondary">Réviser mes erreurs</Button>
                </Link>
              )}
            </Card>
            <Card>
              <p className="text-sm font-medium text-muted">Ta progression</p>
              <p className="mt-1 text-sm text-muted">Consulte l&apos;historique de tes sessions.</p>
              <Link href="/historique" className="mt-3 inline-block">
                <Button variant="secondary">Voir l&apos;historique</Button>
              </Link>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
