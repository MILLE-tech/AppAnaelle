import { createClient } from "@/lib/supabase/server";
import { getStorageUsage } from "@/lib/storage/usage";
import { SubjectForm } from "@/components/subjects/subject-form";
import { SubjectCard } from "@/components/subjects/subject-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StorageUsageBar } from "@/components/ui/storage-usage-bar";

export default async function MatieresPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, color, documents(count)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[matieres] échec du chargement des matières :", error);
  }

  const subjects = Array.isArray(data) ? data : [];
  const storageUsage = await getStorageUsage();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-semibold">Matières</h1>
      <p className="mt-1 text-muted">Crée une matière puis ajoute tes documents de cours.</p>

      <div className="mt-6">
        <StorageUsageBar usage={storageUsage} />
      </div>

      <Card className="mt-4">
        <SubjectForm />
      </Card>

      {error ? (
        <p className="mt-8 text-center text-sm text-danger">
          Impossible de charger tes matières pour l&apos;instant. Réessaie dans un instant.
        </p>
      ) : subjects.length > 0 ? (
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
        <Card className="mt-6">
          <EmptyState
            icon={<BookIcon className="h-6 w-6" />}
            title="Aucune matière pour l'instant"
            description="Crée ta première matière ci-dessus (ex : Culture éco-juridique et managériale), puis ajoute tes cours en PDF ou en photo pour générer fiches et quiz."
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
