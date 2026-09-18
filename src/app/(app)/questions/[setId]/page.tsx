import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clsx } from "@/lib/utils/clsx";
import type { QuestionType } from "@/types/database.types";

const TYPE_LABELS: Record<QuestionType, string> = {
  true_false: "Vrai/Faux",
  mcq: "QCM",
  open: "Questions ouvertes",
};

export default async function QuestionSetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const supabase = await createClient();

  const { data: questionSet } = await supabase
    .from("question_sets")
    .select("id, subject_id, question_type, requested_count")
    .eq("id", setId)
    .single();

  if (!questionSet) notFound();

  const { data: subject } = await supabase
    .from("subjects")
    .select("name")
    .eq("id", questionSet.subject_id)
    .single();

  const { data } = await supabase
    .from("questions")
    .select("*")
    .eq("question_set_id", setId)
    .order("order_index", { ascending: true });

  const questions = Array.isArray(data) ? data : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/matieres/${questionSet.subject_id}`}
        className="text-sm text-muted hover:text-foreground"
      >
        ← {subject?.name ?? "Matière"}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {TYPE_LABELS[questionSet.question_type as QuestionType]} — {questionSet.requested_count} questions
        </h1>
        <Link href={`/reviser/set/${questionSet.id}`}>
          <Button>Lancer la révision</Button>
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {questions.length === 0 ? (
          <p className="text-sm text-muted">Aucune question dans ce lot.</p>
        ) : (
          questions.map((question, index) => (
            <Card key={question.id}>
              <p className="text-xs font-medium text-muted">Question {index + 1}</p>
              <p className="mt-1 text-base font-medium leading-relaxed">{question.prompt}</p>

              {question.question_type === "true_false" && (
                <p className="mt-3 text-sm">
                  <span className="text-muted">Réponse : </span>
                  <span className="font-semibold text-success">
                    {question.correct_answer === "true" ? "Vrai" : "Faux"}
                  </span>
                </p>
              )}

              {question.question_type === "mcq" && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {(question.options ?? []).map((option, i) => {
                    const isCorrect = String(i) === question.correct_answer;
                    return (
                      <li
                        key={i}
                        className={clsx(
                          "rounded-lg border px-3 py-2 text-sm",
                          isCorrect
                            ? "border-success/30 bg-success-soft font-medium text-success"
                            : "border-surface-border text-muted"
                        )}
                      >
                        {option}
                      </li>
                    );
                  })}
                </ul>
              )}

              {question.question_type === "open" && question.explanation && (
                <p className="mt-3 text-sm text-muted">
                  <span className="font-medium text-foreground">Éléments de réponse attendus : </span>
                  {question.explanation}
                </p>
              )}

              {question.question_type !== "open" && question.explanation && (
                <p className="mt-2 text-sm text-muted">{question.explanation}</p>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
