import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateContent, GeminiQuotaError, GeminiOverloadedError } from "@/lib/gemini/client";
import { buildOpenGradingPrompt, OPEN_GRADING_RESPONSE_SCHEMA } from "@/lib/gemini/prompts";

// Laisse le temps aux retries (429/503) de Gemini d'aboutir avant que
// Vercel ne tue la fonction (10s par défaut sur le plan Hobby).
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { answer } = (await request.json()) as { answer?: string };
  if (!answer || !answer.trim()) {
    return NextResponse.json({ error: "Réponse vide." }, { status: 400 });
  }

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id, question_type, prompt, explanation")
    .eq("id", id)
    .single();

  if (questionError || !question) {
    return NextResponse.json({ error: "Question introuvable." }, { status: 404 });
  }

  if (question.question_type !== "open") {
    return NextResponse.json({ error: "Cette question n'est pas une question ouverte." }, { status: 400 });
  }

  try {
    const raw = await generateContent({
      parts: [
        {
          text: buildOpenGradingPrompt(
            question.prompt,
            question.explanation ?? "",
            answer.slice(0, 4000)
          ),
        },
      ],
      responseMimeType: "application/json",
      responseSchema: OPEN_GRADING_RESPONSE_SCHEMA,
      maxOutputTokens: 1024,
    });

    let payload: { score: number; feedback: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Réponse Gemini invalide, réessaie." }, { status: 502 });
    }

    const score = Math.max(0, Math.min(10, Number(payload.score) || 0));

    return NextResponse.json({ score, feedback: payload.feedback });
  } catch (err) {
    if (err instanceof GeminiQuotaError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof GeminiOverloadedError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
