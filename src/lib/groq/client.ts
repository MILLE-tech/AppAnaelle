const API_URL = "https://api.groq.com/openai/v1/chat/completions";

export class GroqQuotaError extends Error {
  constructor() {
    super("Quota Groq atteint pour aujourd'hui. Réessaie demain.");
    this.name = "GroqQuotaError";
  }
}

export class GroqOverloadedError extends Error {
  constructor() {
    super("Le modèle est momentanément indisponible. Réessaie dans une minute.");
    this.name = "GroqOverloadedError";
  }
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user";
  content: string | ContentPart[];
}

interface GenerateOptions {
  model: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

function apiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY manquante côté serveur.");
  return key;
}

export function textModel(): string {
  return process.env.GROQ_TEXT_MODEL?.trim() || "openai/gpt-oss-120b";
}

export function visionModel(): string {
  return process.env.GROQ_VISION_MODEL?.trim() || "meta-llama/llama-4-scout-17b-16e-instruct";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Un appel peut échouer avec un 429 (limite de requêtes/minute ou /jour
// dépassée) ou un 5xx (modèle momentanément indisponible) : on retente
// avec un backoff exponentiel avant d'abandonner.
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

export async function generateChat({
  model,
  messages,
  jsonMode = false,
  temperature = 0.4,
  maxTokens = 8192,
}: GenerateOptions): Promise<string> {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey()}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Erreur réseau Groq");
      await sleep(BASE_DELAY_MS * 2 ** attempt);
      continue;
    }

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) throw new GroqQuotaError();
      await sleep(BASE_DELAY_MS * 2 ** attempt);
      continue;
    }

    if (response.status === 503 || response.status === 500) {
      if (attempt === MAX_RETRIES) throw new GroqOverloadedError();
      await sleep(BASE_DELAY_MS * 2 ** attempt);
      continue;
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Erreur Groq (${response.status}) : ${errText.slice(0, 300)}`);
    }

    const json = await response.json();
    const text: string | undefined = json?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      const finishReason = json?.choices?.[0]?.finish_reason;
      throw new Error(
        finishReason ? `Réponse Groq vide (raison : ${finishReason}).` : "Réponse Groq vide."
      );
    }

    return text;
  }

  throw lastError ?? new Error("Échec de l'appel Groq après plusieurs tentatives.");
}
