import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewSession } from "@/components/review/review-session";

export default async function ReviewErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject: subjectId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  let stateQuery = supabase
    .from("question_review_state")
    .select("question_id")
    .eq("in_review", true);

  if (subjectId) {
    stateQuery = stateQuery.eq("subject_id", subjectId);
  }

  const { data: states } = await stateQuery;
  const questionIds = (states ?? []).map((s) => s.question_id);

  const { data: questions } =
    questionIds.length > 0
      ? await supabase.from("questions").select("*").in("id", questionIds)
      : { data: [] };

  const backHref = subjectId ? `/matieres/${subjectId}` : "/dashboard";
  const backLabel = subjectId ? "Retour à la matière" : "Retour à l'accueil";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">Réviser mes erreurs</h1>
      <ReviewSession
        questions={questions ?? []}
        userId={user.id}
        subjectId={subjectId ?? null}
        sessionType="review_errors"
        backHref={backHref}
        backLabel={backLabel}
      />
    </div>
  );
}
