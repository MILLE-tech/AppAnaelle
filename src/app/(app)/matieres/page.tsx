import { createClient } from "@/lib/supabase/server";
import { SubjectForm } from "@/components/subjects/subject-form";
import { SubjectCard } from "@/components/subjects/subject-card";
import { Card } from "@/components/ui/card";

export default async function MatieresPage() {
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, color, documents(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-semibold">Matières</h1>
      <p className="mt-1 text-muted">Crée une matière puis ajoute tes documents de cours.</p>

      <Card className="mt-6">
        <SubjectForm />
      </Card>

      {subjects && subjects.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              id={subject.id}
              name={subject.name}
              color={subject.color}
              documentCount={subject.documents?.[0]?.count ?? 0}
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-muted">
          Aucune matière pour l&apos;instant — crée la première ci-dessus.
        </p>
      )}
    </div>
  );
}
