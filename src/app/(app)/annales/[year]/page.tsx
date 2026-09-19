import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

export default async function AnnalesYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, color")
    .order("name", { ascending: true });

  const { data: annalesForYear } = await supabase
    .from("annales")
    .select("subject_id")
    .eq("year", year);

  const countBySubject: Record<string, number> = {};
  for (const row of annalesForYear ?? []) {
    countBySubject[row.subject_id] = (countBySubject[row.subject_id] ?? 0) + 1;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/annales" className="text-sm text-muted hover:text-foreground">
        ← Annales
      </Link>
      <h1 className="mt-2 text-3xl font-semibold">Annales {year}</h1>
      <p className="mt-1 text-muted">Choisis une matière pour voir ou déposer des sujets.</p>

      {subjects && subjects.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/annales/${year}/${subject.id}`}
              className="glass-card flex flex-col gap-2 p-5 transition-transform hover:-translate-y-0.5"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
              <h3 className="text-lg font-semibold">{subject.name}</h3>
              <p className="text-sm text-muted">
                {countBySubject[subject.id] ?? 0} fichier{(countBySubject[subject.id] ?? 0) > 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <EmptyState
            icon={<BookIcon className="h-6 w-6" />}
            title="Aucune matière pour l'instant"
            description="Crée une matière dans l'onglet Matières avant de déposer des annales."
          />
        </Card>
      )}
    </div>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 4.5h9a3 3 0 0 1 3 3V20a2 2 0 0 0-2-1.5H5V4.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 18.5V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
