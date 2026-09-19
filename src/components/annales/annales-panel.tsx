"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PdfViewerModal } from "@/components/ui/pdf-viewer-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatFileSize } from "@/lib/utils/format";

export interface AnnaleRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-120);
}

interface AnnalesPanelProps {
  userId: string;
  subjectId: string;
  year: number;
  initialAnnales: AnnaleRow[];
}

export function AnnalesPanel({ userId, subjectId, year, initialAnnales }: AnnalesPanelProps) {
  const [annales, setAnnales] = useState(initialAnnales);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(fileList)) {
      if (file.type !== "application/pdf") {
        setError(`${file.name} : seuls les PDF sont acceptés.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} : fichier trop volumineux (25 Mo max).`);
        continue;
      }

      const id = crypto.randomUUID();
      const storagePath = `${userId}/${subjectId}/${year}/${id}_${sanitizeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from("annales")
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setError(`${file.name} : échec de l'envoi.`);
        continue;
      }

      const { data, error: insertError } = await supabase
        .from("annales")
        .insert({
          id,
          user_id: userId,
          subject_id: subjectId,
          year,
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
        })
        .select("id, file_name, file_path, file_size, created_at")
        .single();

      if (insertError || !data) {
        await supabase.storage.from("annales").remove([storagePath]);
        setError(`${file.name} : échec de l'enregistrement.`);
        continue;
      }

      setAnnales((prev) => [data, ...prev]);
    }

    setIsUploading(false);
  }

  async function handleOpen(annale: AnnaleRow) {
    const supabase = createClient();
    const { data, error: signError } = await supabase.storage
      .from("annales")
      .createSignedUrl(annale.file_path, 300);

    if (signError || !data) {
      setError("Impossible d'ouvrir ce fichier.");
      return;
    }
    setViewer({ url: data.signedUrl, title: annale.file_name });
  }

  async function handleDelete(annale: AnnaleRow) {
    if (!confirm(`Supprimer "${annale.file_name}" ?`)) return;
    const supabase = createClient();
    await supabase.storage.from("annales").remove([annale.file_path]);
    await supabase.from("annales").delete().eq("id", annale.id);
    setAnnales((prev) => prev.filter((a) => a.id !== annale.id));
  }

  return (
    <div className="flex flex-col gap-4">
      <label
        className="glass-card flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-surface-border p-8 text-center transition-colors hover:border-accent/50"
      >
        <UploadIcon className="h-7 w-7 text-muted" />
        <p className="text-sm font-medium">
          {isUploading ? "Envoi en cours..." : "Dépose un ou plusieurs PDF d'annales ici"}
        </p>
        <p className="text-xs text-muted">ou clique pour parcourir — PDF uniquement, 25 Mo max</p>
        <input
          type="file"
          accept="application/pdf"
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

      <div className="glass-card p-4">
        {annales.length === 0 ? (
          <EmptyState
            icon={<UploadIcon className="h-6 w-6" />}
            title="Aucune annale déposée"
            description="Dépose un PDF ci-dessus pour commencer."
          />
        ) : (
          <ul className="divide-y divide-surface-border">
            {annales.map((annale) => (
              <li key={annale.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{annale.file_name}</p>
                  <p className="text-xs text-muted">
                    {formatFileSize(annale.file_size)} · {formatDate(annale.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleOpen(annale)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft"
                  >
                    Ouvrir
                  </button>
                  <button
                    onClick={() => handleDelete(annale)}
                    className="rounded-lg p-1.5 text-muted hover:text-danger"
                    aria-label="Supprimer"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {viewer && (
        <PdfViewerModal url={viewer.url} title={viewer.title} onClose={() => setViewer(null)} />
      )}
    </div>
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
