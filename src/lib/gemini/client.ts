const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiQuotaError extends Error {
  constructor() {
    super("Quota Gemini journalier atteint. Réessaie demain.");
    this.name = "GeminiQuotaError";
  }
}

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GenerateOptions {
  parts: GeminiPart[];
  responseMimeType?: "text/plain" | "application/json";
  responseSchema?: object;
  temperature?: number;
  maxOutputTokens?: number;
}

function model(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY manquante côté serveur.");
  return key;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Un seul appel Gemini peut échouer avec un 429 (RESOURCE_EXHAUSTED) en cas
// de pic de trafic momentané sur le palier gratuit : on retente avec un
// backoff exponentiel avant d'abandonner et de signaler le quota atteint.
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

export async function generateContent({
  parts,
  responseMimeType = "text/plain",
  responseSchema,
  temperature = 0.4,
  maxOutputTokens = 8192,
}: GenerateOptions): Promise<string> {
  const url = `${API_BASE}/${model()}:generateContent?key=${apiKey()}`;

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType,
      ...(responseSchema ? { responseSchema } : {}),
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Erreur réseau Gemini");
      await sleep(BASE_DELAY_MS * 2 ** attempt);
      continue;
    }

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) throw new GeminiQuotaError();
      await sleep(BASE_DELAY_MS * 2 ** attempt);
      continue;
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      if (errText.toUpperCase().includes("RESOURCE_EXHAUSTED")) {
        if (attempt === MAX_RETRIES) throw new GeminiQuotaError();
        await sleep(BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      throw new Error(`Erreur Gemini (${response.status}) : ${errText.slice(0, 300)}`);
    }

    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts
      ?.map((p: GeminiPart) => p.text ?? "")
      .join("")
      .trim();

    if (!text) {
      const finishReason = json?.candidates?.[0]?.finishReason;
      throw new Error(
        finishReason
          ? `Réponse Gemini vide (raison : ${finishReason}).`
          : "Réponse Gemini vide."
      );
    }

    return text;
  }

  throw lastError ?? new Error("Échec de l'appel Gemini après plusieurs tentatives.");
}
