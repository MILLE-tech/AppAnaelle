"use client";

import { useTransition } from "react";
import type { DocumentRow } from "@/lib/documents/pipeline";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "@/lib/utils/clsx";

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

const METHOD_LABELS: Record<string, string> = {
  pdf_text: "Texte PDF",
  pdf_vision: "PDF scanné (vision)",
  image_vision: "Photo (vision)",
};

interface DocumentListProps {
  documents: DocumentRow[];
  onDeleted: (id: string) => void;
}

export function DocumentList({ documents, onDeleted }: DocumentListProps) {
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
        <DocumentItem key={doc.id} doc={doc} onDeleted={onDeleted} />
      ))}
    </ul>
  );
}

function DocumentItem({
  doc,
  onDeleted,
}: {
  doc: DocumentRow;
  onDeleted: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
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
          {doc.extraction_method && (
            <span>{METHOD_LABELS[doc.extraction_method] ?? doc.extraction_method}</span>
          )}
          {doc.char_count != null && <span>{doc.char_count.toLocaleString("fr-FR")} caractères</span>}
          {doc.status === "error" && doc.error_message && (
            <span className="text-danger">{doc.error_message}</span>
          )}
        </div>
      </div>
      <button
        onClick={handleDelete}
        disabled={isPending || busy}
        className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:text-danger disabled:opacity-40"
        aria-label="Supprimer le document"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
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
