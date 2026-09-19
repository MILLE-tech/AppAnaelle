"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { PdfViewerModal } from "@/components/ui/pdf-viewer-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatFileSize } from "@/lib/utils/format";
import { clsx } from "@/lib/utils/clsx";

export interface UsefulDocumentRow {
  id: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  file_size: number;
  created_at: string;
}

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

type FileKind = "pdf" | "word" | "excel" | "powerpoint" | "autre";

function getFileKind(mimeType: string): FileKind {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("word")) return "word";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "excel";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "powerpoint";
  return "autre";
}

const KIND_STYLES: Record<FileKind, { label: string; className: string }> = {
  pdf: { label: "PDF", className: "bg-danger-soft text-danger" },
  word: { label: "DOC", className: "bg-accent-soft text-accent" },
  excel: { label: "XLS", className: "bg-success-soft text-success" },
  powerpoint: { label: "PPT", className: "bg-orange-500/15 text-orange-400" },
  autre: { label: "FICHIER", className: "bg-white/10 text-muted" },
};

function sanitizeFileName(name: string): string {
  return name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-120);
}

interface UsefulDocumentsBlockProps {
  userId: string;
  subjectId: string;
  initialDocuments: UsefulDocumentRow[];
}

export function UsefulDocumentsBlock({
  userId,
  subjectId,
  initialDocuments,
}: UsefulDocumentsBlockProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
        setError(`${file.name} : format non supporté (PDF, Word, Excel ou PowerPoint uniquement).`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} : fichier trop volumineux (25 Mo max).`);
        continue;
      }

      const id = crypto.randomUUID();
      const storagePath = `${userId}/${subjectId}/utiles/${id}_${sanitizeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from("course-documents")
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setError(`${file.name} : échec de l'envoi.`);
        continue;
      }

      const { data, error: insertError } = await supabase
        .from("useful_documents")
        .insert({
          id,
          subject_id: subjectId,
          user_id: userId,
          file_name: file.name,
          mime_type: file.type,
          storage_path: storagePath,
          file_size: file.size,
        })
        .select("id, file_name, mime_type, storage_path, file_size, created_at")
        .single();

      if (insertError || !data) {
        await supabase.storage.from("course-documents").remove([storagePath]);
        setError(`${file.name} : échec de l'enregistrement.`);
        continue;
      }

      setDocuments((prev) => [data, ...prev]);
    }

    setIsUploading(false);
  }

  async function handleOpenOrDownload(doc: UsefulDocumentRow) {
    const supabase = createClient();
    const kind = getFileKind(doc.mime_type);

    if (kind === "pdf") {
      const { data, error: signError } = await supabase.storage
        .from("course-documents")
        .createSignedUrl(doc.storage_path, 300);
      if (signError || !data) {
        setError("Impossible d'ouvrir ce fichier.");
        return;
      }
      setViewer({ url: data.signedUrl, title: doc.file_name });
      return;
    }

    // Word/Excel/PowerPoint : pas d'affichage natif possible sans service
    // tiers payant — on force le téléchargement en l'indiquant clairement.
    const { data, error: signError } = await supabase.storage
      .from("course-documents")
      .createSignedUrl(doc.storage_path, 300, { download: doc.file_name });
    if (signError || !data) {
      setError("Impossible de télécharger ce fichier.");
      return;
    }
    window.location.href = data.signedUrl;
  }

  async function handleDelete(doc: UsefulDocumentRow) {
    if (!confirm(`Supprimer "${doc.file_name}" ?`)) return;
    const supabase = createClient();
    await supabase.storage.from("course-documents").remove([doc.storage_path]);
    await supabase.from("useful_documents").delete().eq("id", doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  }

  return (
    <CollapsibleCard title="Documents utiles" count={documents.length}>
      <div className="flex flex-col gap-4">
        <label className="glass-card flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-surface-border p-6 text-center transition-colors hover:border-accent/50">
          <UploadIcon className="h-6 w-6 text-muted" />
          <p className="text-sm font-medium">
            {isUploading ? "Envoi en cours..." : "Dépose des documents libres ici"}
          </p>
          <p className="text-xs text-muted">PDF, Word, Excel, PowerPoint — 25 Mo max</p>
          <input
            type="file"
            accept={ACCEPTED_MIME_TYPES.join(",")}
            multiple
            disabled={isUploading}
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        {documents.length === 0 ? (
          <EmptyState
            icon={<FolderIcon className="h-6 w-6" />}
            title="Aucun document utile pour l'instant"
            description="Dépose ici tout document annexe : annexes de cours, notes personnelles, etc."
          />
        ) : (
          <ul className="divide-y divide-surface-border">
            {documents.map((doc) => {
              const kind = getFileKind(doc.mime_type);
              const style = KIND_STYLES[kind];
              return (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={clsx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                        style.className
                      )}
                    >
                      {style.label}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{doc.file_name}</p>
                      <p className="text-xs text-muted">
                        {formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleOpenOrDownload(doc)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft"
                    >
                      {kind === "pdf" ? "Ouvrir" : "Télécharger"}
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="rounded-lg p-1.5 text-muted hover:text-danger"
                      aria-label="Supprimer"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {viewer && (
        <PdfViewerModal url={viewer.url} title={viewer.title} onClose={() => setViewer(null)} />
      )}
    </CollapsibleCard>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 15V4m0 0 4 4m-4-4-4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2h7A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
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
