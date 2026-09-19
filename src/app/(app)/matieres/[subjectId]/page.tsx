import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHistory } from "@/lib/history/get-history";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { QuestionsBlock, type QuestionSetSummary } from "@/components/subjects/questions-block";
import { UsefulDocumentsBlock } from "@/components/subjects/useful-documents-block";
import { HistoryCard } from "@/components/history/history-card";
import type { QuestionType } from "@/types/database.types";

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

  const { data: questionSetsRaw } = await supabase
    .from("question_sets")
    .select("id, document_id, question_type, requested_count, created_at")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });

  const { data: questionsForCount } = await supabase
    .from("questions")
    .select("question_set_id")
    .eq("subject_id", subjectId);

  const generatedCountBySet: Record<string, number> = {};
  for (const q of questionsForCount ?? []) {
    generatedCountBySet[q.question_set_id] = (generatedCountBySet[q.question_set_id] ?? 0) + 1;
  }

  const { data: sessionsForSets } = await supabase
    .from("review_sessions")
    .select("question_set_id, correct_count, total_questions")
    .eq("subject_id", subjectId)
    .not("question_set_id", "is", null)
    .not("finished_at", "is", null);

  const bestScoreBySet: Record<string, number> = {};
  for (const session of sessionsForSets ?? []) {
    if (!session.question_set_id || session.total_questions === 0) continue;
    const percent = Math.round((session.correct_count / session.total_questions) * 100);
    const current = bestScoreBySet[session.question_set_id];
    if (current === undefined || percent > current) {
      bestScoreBySet[session.question_set_id] = percent;
    }
  }

  const questionSets: QuestionSetSummary[] = (questionSetsRaw ?? []).map((set) => ({
    id: set.id,
    document_id: set.document_id,
    question_type: set.question_type as QuestionType,
    requested_count: set.requested_count,
    generatedCount: generatedCountBySet[set.id] ?? 0,
    bestScorePercent: bestScoreBySet[set.id] ?? null,
  }));

  const readyDocuments = (documents ?? [])
    .filter((d) => d.status === "ready")
    .map((d) => ({ id: d.id, file_name: d.file_name }));

  const { count: reviewCount } = await supabase
    .from("question_review_state")
    .select("question_id", { count: "exact", head: true })
    .eq("subject_id", subjectId)
    .eq("in_review", true);

  const { data: usefulDocuments } = await supabase
    .from("useful_documents")
    .select("id, file_name, mime_type, storage_path, file_size, created_at")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });

  const history = await getHistory(subjectId);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/matieres" className="text-sm text-muted hover:text-foreground">
        ← Matières
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
        <h1 className="text-3xl font-semibold">{subject.name}</h1>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <DocumentsPanel
          subjectId={subject.id}
          userId={user.id}
          initialDocuments={documents ?? []}
          initialSheetsByDocument={sheetsByDocument}
        />

        <QuestionsBlock
          subjectId={subject.id}
          initialSets={questionSets}
          readyDocuments={readyDocuments}
          reviewCount={reviewCount ?? 0}
        />

        <UsefulDocumentsBlock
          userId={user.id}
          subjectId={subject.id}
          initialDocuments={usefulDocuments ?? []}
        />

        <div>
          <h2 className="mb-3 text-lg font-semibold">Historique</h2>
          <div className="flex flex-col gap-4">
            <HistoryCard history={history} hideSubjectColumn />
          </div>
        </div>
      </div>
    </div>
  );
}
