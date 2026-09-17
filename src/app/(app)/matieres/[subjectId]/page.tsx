import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { Button } from "@/components/ui/button";

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

  const { data: sheets } = await supabase
    .from("revision_sheets")
    .select("id, document_id, title")
    .eq("subject_id", subjectId);

  const sheetsByDocument = Object.fromEntries(
    (sheets ?? []).map((sheet) => [sheet.document_id, sheet])
  );

  const { data: questionSets } = await supabase
    .from("question_sets")
    .select("id, document_id, question_type, requested_count")
    .eq("subject_id", subjectId);

  const questionSetsByDocument: Record<
    string,
    { id: string; document_id: string; question_type: string; requested_count: number }[]
  > = {};
  for (const set of questionSets ?? []) {
    (questionSetsByDocument[set.document_id] ??= []).push(set);
  }

  const { count: reviewCount } = await supabase
    .from("question_review_state")
    .select("question_id", { count: "exact", head: true })
    .eq("subject_id", subjectId)
    .eq("in_review", true);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/matieres" className="text-sm text-muted hover:text-foreground">
        ← Matières
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: subject.color }}
          />
          <h1 className="text-3xl font-semibold">{subject.name}</h1>
        </div>

        {!!reviewCount && (
          <Link href={`/reviser/erreurs?subject=${subject.id}`}>
            <Button variant="secondary">Réviser mes erreurs ({reviewCount})</Button>
          </Link>
        )}
      </div>

      <div className="mt-6">
        <DocumentsPanel
          subjectId={subject.id}
          userId={user.id}
          initialDocuments={documents ?? []}
          initialSheetsByDocument={sheetsByDocument}
          initialQuestionSetsByDocument={questionSetsByDocument}
        />
      </div>
    </div>
  );
}
