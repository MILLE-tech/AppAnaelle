"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { processDocument, type DocumentRow } from "@/lib/documents/pipeline";
import { UploadZone } from "@/components/documents/upload-zone";
import { DocumentList } from "@/components/documents/document-list";
import { Card } from "@/components/ui/card";

interface DocumentsPanelProps {
  subjectId: string;
  userId: string;
  initialDocuments: DocumentRow[];
}

export function DocumentsPanel({ subjectId, userId, initialDocuments }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ index: number; total: number; stage: string } | null>(
    null
  );

  function upsertDocument(doc: DocumentRow) {
    setDocuments((prev) => {
      const exists = prev.some((d) => d.id === doc.id);
      return exists ? prev.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...prev];
    });
  }

  // Traite les fichiers un par un (jamais en parallèle) : chaque fichier
  // implique un appel Gemini potentiel, et le palier gratuit est limité.
  async function handleFilesSelected(files: File[], keepOriginal: boolean) {
    setIsProcessing(true);
    const supabase = createClient();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ index: i + 1, total: files.length, stage: "Démarrage..." });

      try {
        await processDocument(supabase, file, subjectId, userId, keepOriginal, {
          onDocumentCreated: upsertDocument,
          onDocumentUpdated: upsertDocument,
          onStage: (stage) => setProgress({ index: i + 1, total: files.length, stage }),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inattendue.";
        alert(`${file.name} : ${message}`);
      }
    }

    setProgress(null);
    setIsProcessing(false);
  }

  function handleDeleted(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  const progressLabel = progress
    ? `Document ${progress.index}/${progress.total} — ${progress.stage}`
    : null;

  return (
    <div className="flex flex-col gap-4">
      <UploadZone
        onFilesSelected={handleFilesSelected}
        disabled={isProcessing}
        progressLabel={progressLabel}
      />
      <Card>
        <DocumentList documents={documents} onDeleted={handleDeleted} />
      </Card>
    </div>
  );
}
