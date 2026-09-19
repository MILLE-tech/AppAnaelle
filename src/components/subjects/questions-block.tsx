"use client";

import { useState } from "react";
import Link from "next/link";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  generateQuestionsInBatches,
  type GeneratedQuestionSet,
} from "@/lib/documents/question-generation";
import type { QuestionType } from "@/types/database.types";

const TYPE_LABELS: Record<QuestionType, string> = {
  true_false: "Vrai/Faux",
  mcq: "QCM",
  open: "Questions ouvertes",
};

const TYPE_OPTIONS: QuestionType[] = ["true_false", "mcq", "open"];
const COUNT_OPTIONS = [10, 20, 40, 50, 80, 100] as const;

export interface QuestionSetSummary {
  id: string;
  document_id: string;
  question_type: QuestionType;
  requested_count: number;
  generatedCount: number;
  bestScorePercent: number | null;
}

export interface ReadyDocumentOption {
  id: string;
  file_name: string;
}

interface QuestionsBlockProps {
  subjectId: string;
  initialSets: QuestionSetSummary[];
  readyDocuments: ReadyDocumentOption[];
  reviewCount: number;
}

export function QuestionsBlock({
  subjectId,
  initialSets,
  readyDocuments,
  reviewCount,
}: QuestionsBlockProps) {
  const [sets, setSets] = useState(initialSets);
  const [formOpen, setFormOpen] = useState(false);
  const [documentId, setDocumentId] = useState(readyDocuments[0]?.id ?? "");
  const [type, setType] = useState<QuestionType>("mcq");
  const [count, setCount] = useState<number>(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ generated: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runGeneration() {
    if (!documentId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result: GeneratedQuestionSet = await generateQuestionsInBatches(
        documentId,
        type,
        count,
        (p) => setProgress({ generated: p.generatedCount, total: p.totalCount })
      );
      setSets((prev) => {
        const exists = prev.some((s) => s.id === result.id);
        const entry: QuestionSetSummary = {
          id: result.id,
          document_id: result.document_id,
          question_type: result.question_type as QuestionType,
          requested_count: result.requested_count,
          generatedCount: count,
          bestScorePercent: exists ? prev.find((s) => s.id === result.id)!.bestScorePercent : null,
        };
        return exists ? prev.map((s) => (s.id === result.id ? entry : s)) : [entry, ...prev];
      });
      setFormOpen(false);
      setProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <CollapsibleCard title="Questions" count={sets.length}>
      <div className="flex flex-col gap-4">
        {reviewCount > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm">
            <span>
              {reviewCount} question{reviewCount > 1 ? "s" : ""} à revoir dans cette matière
            </span>
            <Link href={`/reviser/erreurs?subject=${subjectId}`}>
              <Button variant="secondary" className="!px-3 !py-1.5 text-xs">
                Réviser mes erreurs
              </Button>
            </Link>
          </div>
        )}

        {sets.length === 0 ? (
          <EmptyState
            icon={<QuizIcon className="h-6 w-6" />}
            title="Aucun lot de questions pour l'instant"
            description="Génère un lot à partir d'un de tes documents prêts pour commencer à réviser."
          />
        ) : (
          <ul className="divide-y divide-surface-border">
            {sets.map((set) => {
              const incomplete = set.generatedCount < set.requested_count;
              return (
                <li key={set.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {TYPE_LABELS[set.question_type]} — {set.requested_count} questions
                      {incomplete && (
                        <span className="ml-2 text-xs text-danger">
                          ({set.generatedCount}/{set.requested_count} générées)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {set.bestScorePercent != null
                        ? `Meilleur score : ${set.bestScorePercent}%`
                        : "Pas encore tenté"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/questions/${set.id}`}
                      className="rounded-lg border border-surface-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground"
                    >
                      Voir
                    </Link>
                    <Link
                      href={`/reviser/set/${set.id}`}
                      className="rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent hover:brightness-110"
                    >
                      Réviser
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {readyDocuments.length === 0 ? (
          <p className="text-xs text-muted">
            Ajoute et attends qu&apos;un document soit &quot;Prêt&quot; dans le bloc Cours pour
            générer des questions.
          </p>
        ) : formOpen ? (
          <div className="rounded-xl border border-surface-border p-4">
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Document source</label>
                <select
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  disabled={isGenerating}
                  className="w-full rounded-lg border border-surface-border bg-white/[0.03] px-3 py-2 text-sm outline-none"
                >
                  {readyDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.file_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as QuestionType)}
                    disabled={isGenerating}
                    className="w-full rounded-lg border border-surface-border bg-white/[0.03] px-3 py-2 text-sm outline-none"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-muted">Nombre</label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    disabled={isGenerating}
                    className="w-full rounded-lg border border-surface-border bg-white/[0.03] px-3 py-2 text-sm outline-none"
                  >
                    {COUNT_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c} questions
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {count > 50 && (
                <p className="text-xs text-muted">
                  Au-delà de 50 questions, la génération se fait par lots de 20 et peut prendre
                  plusieurs minutes — elle consomme aussi une part notable du quota Groq gratuit
                  du jour.
                </p>
              )}

              {progress && (
                <div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full gradient-accent transition-all duration-300"
                      style={{ width: `${(progress.generated / progress.total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {progress.generated}/{progress.total} générées...
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-danger">
                  {error} — les questions déjà générées sont conservées, tu peux reprendre.
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFormOpen(false)}
                  disabled={isGenerating}
                >
                  Annuler
                </Button>
                <Button onClick={runGeneration} disabled={isGenerating}>
                  {isGenerating ? "Génération..." : error ? "Reprendre" : "Lancer la génération"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setFormOpen(true)} className="self-start">
            Générer un nouveau lot
          </Button>
        )}
      </div>
    </CollapsibleCard>
  );
}

function QuizIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 9a3 3 0 1 1 4 2.8c-.6.25-1 .85-1 1.5V14M12 17.5h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
