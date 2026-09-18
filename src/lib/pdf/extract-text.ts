"use client";

import type { TextItem } from "pdfjs-dist/types/src/display/api";

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  // Un PDF scanné (images uniquement) produit très peu ou pas de texte.
  looksScanned: boolean;
}

// Nombre moyen de caractères par page en dessous duquel on considère que
// le PDF est scanné et qu'il faut basculer sur l'extraction par vision.
const MIN_CHARS_PER_PAGE = 30;

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  );
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.toString();
  return pdfjs;
}

export async function extractTextFromPdf(file: File): Promise<PdfExtractionResult> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? (item as TextItem).str : ""))
      .join(" ");
    pageTexts.push(pageText.trim());
  }

  const text = pageTexts.join("\n\n").trim();
  const looksScanned = text.length < MIN_CHARS_PER_PAGE * doc.numPages;

  return { text, pageCount: doc.numPages, looksScanned };
}

// Rendu de chaque page du PDF en image (utilisé uniquement en secours pour
// un PDF scanné, avant envoi au modèle vision).
export async function renderPdfPagesToImages(
  file: File,
  maxWidth = 1600
): Promise<string[]> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const images: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, maxWidth / baseViewport.width);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Impossible d'initialiser le rendu du PDF.");

    await page.render({ canvasContext: context, viewport }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.85));
  }

  return images;
}
