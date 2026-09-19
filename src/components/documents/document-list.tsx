"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { DocumentRow } from "@/lib/documents/pipeline";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "@/lib/utils/clsx";
import { PdfViewerModal } from "@/components/ui/pdf-viewer-modal";
import { formatDate } from "@/lib/utils/format";

export interface SheetSummary {
  id: string;
  document_id: string;
  title: string;
}

const STATUS_LABELS: Record<DocumentRow["status"], string> = {
  uploading: "Envoi...",
  extracting: "Extraction...",
  analyzing: "Analyse...",
  ready: "Prêt",
  error: "Erreur",
};

const STATUS_CLASSES: Record<DocumentRow["status"], string> = {
  uploading: "bg-accent-soft text-accent",
  extracting: "bg-accent-soft text-accent",
  analyzing: "bg-accent-soft text-accent",
  ready: "bg-success-soft text-success",
  error: "bg-danger-soft text-danger",
};

interface DocumentListProps {
  documents: DocumentRow[];
  sheetsByDocument: Record<string, SheetSummary>;
  onDeleted: (id: string) => void;
  onSheetGenerated: (documentId: string, sheet: SheetSummary) => void;
  disableGeneration: boolean;
}

export function DocumentList({
  documents,
  sheetsByDocument,
  onDeleted,
  onSheetGenerated,
  disableGeneration,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        Aucun document pour l&apos;instant.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-surface-border">
      {documents.map((doc) => (
        <DocumentItem
          key={doc.id}
          doc={doc}
          sheet={sheetsByDocument[doc.id]}
          onDeleted={onDeleted}
          onSheetGenerated={onSheetGenerated}
          disableGeneration={disableGeneration}
        />
      ))}
    </ul>
  );
}

function DocumentItem({
  doc,
  sheet,
  onDeleted,
  onSheetGenerated,
  disableGeneration,
}: {
  doc: DocumentRow;
  sheet: SheetSummary | undefined;
  onDeleted: (id: string) => void;
  onSheetGenerated: (documentId: string, sheet: SheetSummary) => void;
  disableGeneration: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const busy = ["uploading", "extracting", "analyzing"].includes(doc.status);

  function handleDelete() {
    if (!confirm(`Supprimer "${doc.file_name}" ?`)) return;
    startTransition(async () => {
      const supabase = createClient();
      if (doc.storage_path) {
        await supabase.storage.from("course-documents").remove([doc.storage_path]);
      }
      await supabase.from("documents").delete().eq("id", doc.id);
      onDeleted(doc.id);
    });
  }

  async function handleOpen() {
    if (!doc.storage_path) return;
    setIsOpening(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("course-documents")
        .createSignedUrl(doc.storage_path, 300);
      if (error || !data) throw new Error();
      setViewerUrl(data.signedUrl);
    } catch {
      alert("Impossible d'ouvrir ce fichier.");
    } finally {
      setIsOpening(false);
    }
  }

  async function handleGenerateSheet() {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch(`/api/documents/${doc.id}/generate-sheet`, {
        method: "POST",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Échec de la génération de la fiche.");
      }
      onSheetGenerated(doc.id, json.sheet);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.file_name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
              STATUS_CLASSES[doc.status]
            )}
          >
            {busy && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            )}
            {STATUS_LABELS[doc.status]}
          </span>
          <span>Ajouté le {formatDate(doc.created_at)}</span>
          {doc.status === "error" && doc.error_message && (
            <span className="text-danger">{doc.error_message}</span>
          )}
        </div>

        {doc.status === "ready" && (
          <div className="mt-2 flex flex-wrap gap-2">
            {doc.storage_path ? (
              <button
                onClick={handleOpen}
                disabled={isOpening}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                {isOpening ? "Ouverture..." : "Ouvrir"}
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-muted opacity-60"
                title="Fichier original non conservé"
              >
                Non consultable
              </span>
            )}

            {sheet ? (
              <Link
                href={`/fiches/${sheet.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent hover:brightness-110"
              >
                Voir la fiche
              </Link>
            ) : (
              <button
                onClick={handleGenerateSheet}
                disabled={isGenerating || disableGeneration}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                {isGenerating ? "Génération..." : "Générer une fiche"}
              </button>
            )}
          </div>
        )}
        {generationError && <p className="mt-1 text-xs text-danger">{generationError}</p>}
      </div>
      <button
        onClick={handleDelete}
        disabled={isPending || busy}
        className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:text-danger disabled:opacity-40"
        aria-label="Supprimer le document"
      >
        <TrashIcon className="h-4 w-4" />
      </button>

      {viewerUrl && (
        <PdfViewerModal url={viewerUrl} title={doc.file_name} onClose={() => setViewerUrl(null)} />
      )}
    </li>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0-.6 12a2 2 0 0 1-2 1.9H9.6a2 2 0 0 1-2-1.9L7 7h10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
