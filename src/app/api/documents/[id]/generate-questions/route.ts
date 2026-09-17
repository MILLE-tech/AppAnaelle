import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateContent, GeminiQuotaError } from "@/lib/gemini/client";
import { buildQuestionsPrompt, QUESTIONS_RESPONSE_SCHEMA } from "@/lib/gemini/prompts";
import type { QuestionType } from "@/types/database.types";

const VALID_TYPES: QuestionType[] = ["true_false", "mcq", "open"];
const VALID_COUNTS = [5, 10, 20];

interface RawQuestion {
  prompt: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

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

  const body = (await request.json()) as { questionType?: string; count?: number };
  const questionType = body.questionType as QuestionType;

  if (!VALID_TYPES.includes(questionType) || !VALID_COUNTS.includes(body.count as number)) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }
  const count = body.count as number;

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, subject_id, status, extracted_text")
    .eq("id", id)
    .single();

  if (documentError || !document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  if (document.status !== "ready" || !document.extracted_text) {
    return NextResponse.json(
      { error: "Le document n'est pas encore prêt pour la génération." },
      { status: 400 }
    );
  }

  // Un lot de questions n'est jamais régénéré automatiquement : si un lot
  // identique (même document, type, nombre) existe déjà, on le renvoie.
  const { data: existingSet } = await supabase
    .from("question_sets")
    .select("*")
    .eq("document_id", id)
    .eq("question_type", questionType)
    .eq("requested_count", count)
    .maybeSingle();

  if (existingSet) {
    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("*")
      .eq("question_set_id", existingSet.id)
      .order("order_index", { ascending: true });

    return NextResponse.json({ questionSet: existingSet, questions: existingQuestions ?? [] });
  }

  try {
    const raw = await generateContent({
      parts: [
        { text: buildQuestionsPrompt(questionType, count) },
        { text: `\n\nTexte du cours :\n"""\n${document.extracted_text.slice(0, 60000)}\n"""` },
      ],
      responseMimeType: "application/json",
      responseSchema: QUESTIONS_RESPONSE_SCHEMA,
      maxOutputTokens: 8192,
    });

    let payload: { questions: RawQuestion[] };
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Réponse Gemini invalide, réessaie." },
        { status: 502 }
      );
    }

    const rawQuestions = payload.questions;
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return NextResponse.json(
        { error: "Réponse Gemini incomplète, réessaie." },
        { status: 502 }
      );
    }

    const modelUsed = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

    const { data: questionSet, error: setError } = await supabase
      .from("question_sets")
      .insert({
        document_id: id,
        subject_id: document.subject_id,
        user_id: user.id,
        question_type: questionType,
        requested_count: count,
        model_used: modelUsed,
      })
      .select()
      .single();

    if (setError || !questionSet) {
      return NextResponse.json({ error: "Impossible d'enregistrer le lot de questions." }, { status: 500 });
    }

    const rowsToInsert = rawQuestions.slice(0, count).map((q, index) => ({
      question_set_id: questionSet.id,
      subject_id: document.subject_id,
      user_id: user.id,
      question_type: questionType,
      prompt: q.prompt,
      options: questionType === "mcq" ? q.options : null,
      correct_answer: questionType === "open" ? null : q.correct_answer,
      explanation: q.explanation ?? null,
      order_index: index,
    }));

    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .insert(rowsToInsert)
      .select();

    if (questionsError || !questions) {
      await supabase.from("question_sets").delete().eq("id", questionSet.id);
      return NextResponse.json({ error: "Impossible d'enregistrer les questions." }, { status: 500 });
    }

    return NextResponse.json({ questionSet, questions });
  } catch (err) {
    if (err instanceof GeminiQuotaError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
