"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuestionType } from "@/types/database.types";

export interface QuestionSetSummary {
  id: string;
  document_id: string;
  question_type: string;
  requested_count: number;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  true_false: "Vrai/Faux",
  mcq: "QCM",
  open: "Questions ouvertes",
};

const TYPE_OPTIONS: QuestionType[] = ["true_false", "mcq", "open"];
const COUNT_OPTIONS = [5, 10, 20] as const;

interface QuestionSetsPanelProps {
  documentId: string;
  sets: QuestionSetSummary[];
  disabled: boolean;
  onSetCreated: (documentId: string, set: QuestionSetSummary) => void;
}

export function QuestionSetsPanel({
  documentId,
  sets,
  disabled,
  onSetCreated,
}: QuestionSetsPanelProps) {
  const [type, setType] = useState<QuestionType>("mcq");
  const [count, setCount] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionType: type, count }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Échec de la génération des questions.");
      }
      onSetCreated(documentId, json.questionSet);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {sets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sets.map((set) => (
            <span
              key={set.id}
              className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-1 py-1 text-xs font-medium text-accent"
            >
              <Link
                href={`/questions/${set.id}`}
                className="px-1.5 py-0.5 hover:brightness-110"
              >
                {TYPE_LABELS[set.question_type as QuestionType]} ({set.requested_count})
              </Link>
              <Link
                href={`/reviser/set/${set.id}`}
                className="rounded-md bg-white/10 px-1.5 py-0.5 hover:brightness-110"
              >
                Réviser
              </Link>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          disabled={disabled || isGenerating}
          className="rounded-lg border border-surface-border bg-white/[0.03] px-2 py-1 text-xs text-foreground outline-none"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          disabled={disabled || isGenerating}
          className="rounded-lg border border-surface-border bg-white/[0.03] px-2 py-1 text-xs text-foreground outline-none"
        >
          {COUNT_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c} questions
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={disabled || isGenerating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          {isGenerating ? "Génération..." : "Générer des questions"}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
