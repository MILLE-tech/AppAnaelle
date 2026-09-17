import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-semibold">
        Salut{firstName ? ` ${firstName}` : ""} 👋
      </h1>
      <p className="mt-1 text-muted">Prête à réviser aujourd&apos;hui ?</p>

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
          <p className="text-sm text-muted">
            Aucune évaluation à venir.{" "}
            <Link href="/calendrier" className="text-accent underline underline-offset-4">
              Ajoute-en une dans le calendrier
            </Link>
            .
          </p>
        </Card>
      )}

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
    </div>
  );
}
