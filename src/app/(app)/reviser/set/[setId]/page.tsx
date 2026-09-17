import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewSession } from "@/components/review/review-session";

export default async function ReviewSetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: questionSet } = await supabase
    .from("question_sets")
    .select("id, subject_id")
    .eq("id", setId)
    .single();

  if (!questionSet) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("question_set_id", setId)
    .order("order_index", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl">
      <ReviewSession
        questions={questions ?? []}
        userId={user.id}
        subjectId={questionSet.subject_id}
        sessionType="normal"
        backHref={`/matieres/${questionSet.subject_id}`}
        backLabel="Retour à la matière"
      />
    </div>
  );
}
