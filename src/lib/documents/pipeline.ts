"use client";

import type { Database } from "@/types/database.types";
import type { createClient } from "@/lib/supabase/client";
import { extractTextFromPdf, renderPdfPagesToImages } from "@/lib/pdf/extract-text";
import { resizeImageForVision } from "@/lib/image/resize";

const ACCEPTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
type Supabase = ReturnType<typeof createClient>;

export interface PipelineCallbacks {
  onDocumentCreated: (doc: DocumentRow) => void;
  onDocumentUpdated: (doc: DocumentRow) => void;
  onStage: (stage: string) => void;
}

export function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return "Format non supporté (PDF, JPG, PNG ou WEBP uniquement).";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Fichier trop volumineux (25 Mo max).";
  }
  return null;
}

function sanitizeFileName(name: string): string {
  return name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-120);
}

async function callVisionExtraction(
  documentId: string,
  images: { base64: string; mimeType: string }[]
): Promise<string> {
  const response = await fetch(`/api/documents/${documentId}/extract-vision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? "Échec de l'extraction par vision.");
  }
  return json.text as string;
}

export async function processDocument(
  supabase: Supabase,
  file: File,
  subjectId: string,
  userId: string,
  keepOriginal: boolean,
  callbacks: PipelineCallbacks
): Promise<void> {
  const validationError = validateFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  callbacks.onStage("Préparation du document...");
  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      subject_id: subjectId,
      user_id: userId,
      file_name: file.name,
      mime_type: file.type,
      status: "uploading",
      keep_original: keepOriginal,
    })
    .select()
    .single();

  if (insertError || !document) {
    throw new Error("Impossible d'enregistrer le document.");
  }
  callbacks.onDocumentCreated(document);

  const markError = async (message: string) => {
    const { data } = await supabase
      .from("documents")
      .update({ status: "error", error_message: message })
      .eq("id", document.id)
      .select()
      .single();
    if (data) callbacks.onDocumentUpdated(data);
  };

  const storagePath = `${userId}/${subjectId}/${document.id}/${sanitizeFileName(file.name)}`;

  try {
    callbacks.onStage(`Envoi de "${file.name}"...`);
    const { error: uploadError } = await supabase.storage
      .from("course-documents")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      await markError("Échec de l'envoi du fichier.");
      return;
    }

    const { data: uploaded } = await supabase
      .from("documents")
      .update({ storage_path: storagePath, status: "extracting" })
      .eq("id", document.id)
      .select()
      .single();
    if (uploaded) callbacks.onDocumentUpdated(uploaded);

    let extractedText = "";
    let extractionMethod: "pdf_text" | "pdf_vision" | "image_vision";
    let pageCount: number | null = null;

    if (file.type === "application/pdf") {
      callbacks.onStage(`Lecture du PDF "${file.name}"...`);
      const result = await extractTextFromPdf(file);
      pageCount = result.pageCount;

      if (!result.looksScanned && result.text.length > 0) {
        extractedText = result.text;
        extractionMethod = "pdf_text";
      } else {
        callbacks.onStage(`PDF scanné détecté, extraction par vision (${result.pageCount} page(s))...`);
        const images = await renderPdfPagesToImages(file);
        extractedText = await callVisionExtraction(
          document.id,
          images.map((dataUrl) => ({
            base64: dataUrl.split(",", 2)[1],
            mimeType: "image/jpeg",
          }))
        );
        extractionMethod = "pdf_vision";
      }
    } else {
      callbacks.onStage(`Analyse de la photo "${file.name}"...`);
      const resized = await resizeImageForVision(file);
      extractedText = await callVisionExtraction(document.id, [resized]);
      extractionMethod = "image_vision";
    }

    if (!extractedText.trim()) {
      await markError("Aucun texte n'a pu être extrait de ce document.");
      return;
    }

    callbacks.onStage(`Finalisation de "${file.name}"...`);
    const { data: analyzed } = await supabase
      .from("documents")
      .update({ status: "analyzing" })
      .eq("id", document.id)
      .select()
      .single();
    if (analyzed) callbacks.onDocumentUpdated(analyzed);

    let finalStoragePath: string | null = storagePath;
    if (!keepOriginal) {
      await supabase.storage.from("course-documents").remove([storagePath]);
      finalStoragePath = null;
    }

    const { data: ready } = await supabase
      .from("documents")
      .update({
        status: "ready",
        extracted_text: extractedText,
        extraction_method: extractionMethod,
        page_count: pageCount,
        char_count: extractedText.length,
        storage_path: finalStoragePath,
        error_message: null,
      })
      .eq("id", document.id)
      .select()
      .single();
    if (ready) callbacks.onDocumentUpdated(ready);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inattendue.";
    await markError(message);
  }
}
