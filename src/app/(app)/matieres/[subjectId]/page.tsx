import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentsPanel } from "@/components/documents/documents-panel";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, color")
    .eq("id", subjectId)
    .single();

  if (!subject) notFound();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/matieres" className="text-sm text-muted hover:text-foreground">
        ← Matières
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: subject.color }}
        />
        <h1 className="text-3xl font-semibold">{subject.name}</h1>
      </div>

      <div className="mt-6">
        <DocumentsPanel
          subjectId={subject.id}
          userId={user.id}
          initialDocuments={documents ?? []}
        />
      </div>
    </div>
  );
}
