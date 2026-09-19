"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  createReviewSession,
  finishReviewSession,
  isLocalAnswerCorrect,
  recordAnswer,
  OPEN_CORRECT_THRESHOLD,
  type QuestionRow,
} from "@/lib/review/engine";
import type { SessionType } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clsx } from "@/lib/utils/clsx";

interface ReviewSessionProps {
  questions: QuestionRow[];
  userId: string;
  subjectId: string | null;
  sessionType: SessionType;
  backHref: string;
  backLabel: string;
  questionSetId?: string | null;
}

type Feedback = {
  isCorrect: boolean;
  explanation: string | null;
  score?: number;
  aiFeedback?: string;
};

export function ReviewSession({
  questions,
  userId,
  subjectId,
  sessionType,
  backHref,
  backLabel,
  questionSetId = null,
}: ReviewSessionProps) {
  const supabase = useRef(createClient()).current;
  const startedAt = useRef(Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [openAnswer, setOpenAnswer] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    createReviewSession(supabase, userId, subjectId, sessionType, questionSetId).then(setSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = questions[index];
  const total = questions.length;

  async function submitAnswer(userAnswer: string, isCorrect: boolean, score?: number, aiFeedback?: string) {
    if (isCorrect) setCorrectCount((c) => c + 1);
    setFeedback({ isCorrect, explanation: question.explanation, score, aiFeedback });

    if (sessionId) {
      await recordAnswer(supabase, {
        sessionId,
        question,
        userId,
        userAnswer,
        isCorrect,
        score: score ?? null,
        aiFeedback: aiFeedback ?? null,
      });
    }
  }

  function handleChoice(answer: string) {
    if (feedback) return;
    setSelectedAnswer(answer);
    submitAnswer(answer, isLocalAnswerCorrect(question, answer));
  }

  async function handleGradeOpen() {
    if (!openAnswer.trim() || isGrading) return;
    setIsGrading(true);
    setGradingError(null);
    try {
      const response = await fetch(`/api/questions/${question.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: openAnswer }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Échec de la correction.");
      await submitAnswer(openAnswer, json.score >= OPEN_CORRECT_THRESHOLD, json.score, json.feedback);
    } catch (err) {
      setGradingError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsGrading(false);
    }
  }

  async function handleNext() {
    if (index + 1 >= total) {
      if (sessionId) {
        const duration = Math.round((Date.now() - startedAt.current) / 1000);
        await finishReviewSession(supabase, sessionId, total, correctCount, duration);
      }
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setFeedback(null);
    setSelectedAnswer(null);
    setOpenAnswer("");
    setGradingError(null);
  }

  if (total === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">Aucune question disponible.</p>
        <Link href={backHref} className="mt-3 inline-block text-sm text-accent">
          {backLabel}
        </Link>
      </Card>
    );
  }

  if (finished) {
    const percent = Math.round((correctCount / total) * 100);
    return (
      <Card className="text-center">
        <p className="text-sm text-muted">Session terminée</p>
        <p className="mt-2 text-5xl font-semibold">
          {correctCount}/{total}
        </p>
        <p className="mt-1 text-muted">{percent}% de bonnes réponses</p>
        <Link href={backHref} className="mt-6 inline-block">
          <Button variant="secondary">{backLabel}</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full gradient-accent transition-all duration-300"
          style={{ width: `${((index + (feedback ? 1 : 0)) / total) * 100}%` }}
        />
      </div>
      <p className="mb-3 text-xs text-muted">
        Question {index + 1}/{total}
      </p>

      <Card>
        <p className="text-lg font-medium leading-relaxed">{question.prompt}</p>

        {question.question_type === "true_false" && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <ChoiceButton
              label="Vrai"
              selected={feedback !== null}
              isSelected={selectedAnswer === "true"}
              isTarget="true"
              question={question}
              onClick={() => handleChoice("true")}
            />
            <ChoiceButton
              label="Faux"
              selected={feedback !== null}
              isSelected={selectedAnswer === "false"}
              isTarget="false"
              question={question}
              onClick={() => handleChoice("false")}
            />
          </div>
        )}

        {question.question_type === "mcq" && (
          <div className="mt-5 flex flex-col gap-2.5">
            {(question.options ?? []).map((option, i) => (
              <ChoiceButton
                key={i}
                label={option}
                selected={feedback !== null}
                isSelected={selectedAnswer === String(i)}
                isTarget={String(i)}
                question={question}
                onClick={() => handleChoice(String(i))}
              />
            ))}
          </div>
        )}

        {question.question_type === "open" && (
          <div className="mt-5">
            <textarea
              value={openAnswer}
              onChange={(e) => setOpenAnswer(e.target.value)}
              disabled={feedback !== null}
              rows={6}
              placeholder="Rédige ta réponse..."
              className="w-full rounded-xl border border-surface-border bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-accent/60 disabled:opacity-70"
            />
            {gradingError && <p className="mt-2 text-sm text-danger">{gradingError}</p>}
            {!feedback && (
              <Button className="mt-3" onClick={handleGradeOpen} disabled={isGrading || !openAnswer.trim()}>
                {isGrading ? "Correction en cours..." : "Corriger ma réponse"}
              </Button>
            )}
          </div>
        )}

        {feedback && (
          <div
            className={clsx(
              "animate-feedback mt-5 rounded-xl border p-4 text-sm",
              feedback.isCorrect
                ? "border-success/30 bg-success-soft"
                : "border-danger/30 bg-danger-soft"
            )}
          >
            <p className="font-semibold">
              {question.question_type === "open"
                ? `Note : ${feedback.score}/10`
                : feedback.isCorrect
                  ? "Bonne réponse !"
                  : "Pas tout à fait..."}
            </p>
            <p className="mt-1 text-muted">{feedback.aiFeedback ?? feedback.explanation}</p>
          </div>
        )}

        {feedback && (
          <Button className="mt-5" onClick={handleNext}>
            {index + 1 >= total ? "Voir mon score" : "Suivant"}
          </Button>
        )}
      </Card>
    </div>
  );
}

function ChoiceButton({
  label,
  isTarget,
  question,
  selected,
  isSelected,
  onClick,
}: {
  label: string;
  isTarget: string;
  question: QuestionRow;
  selected: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isCorrectAnswer = question.correct_answer === isTarget;

  return (
    <button
      onClick={onClick}
      disabled={selected}
      className={clsx(
        "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
        !selected && "border-surface-border hover:border-accent/50 hover:bg-white/5",
        selected && isCorrectAnswer && "animate-feedback border-success/40 bg-success-soft",
        selected && !isCorrectAnswer && isSelected && "animate-shake border-danger/40 bg-danger-soft",
        selected && !isCorrectAnswer && !isSelected && "border-surface-border opacity-50"
      )}
    >
      {label}
    </button>
  );
}
