"use client";

const MAX_WIDTH = 1600;

export interface ResizedImage {
  base64: string;
  mimeType: string;
}

// Redimensionne l'image à 1600px de large max avant envoi à Gemini vision,
// pour limiter la consommation de tokens (et donc le quota gratuit).
export async function resizeImageForVision(file: File): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossible d'initialiser le redimensionnement de l'image.");
  context.drawImage(bitmap, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = dataUrl.split(",", 2)[1];

  return { base64, mimeType: "image/jpeg" };
}
