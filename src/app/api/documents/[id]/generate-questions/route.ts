import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateChat, GroqQuotaError, GroqOverloadedError, textModel } from "@/lib/groq/client";
import { buildQuestionsPrompt } from "@/lib/groq/prompts";
import type { QuestionType } from "@/types/database.types";

// Laisse le temps aux retries (429/5xx) de Groq d'aboutir avant que
// Vercel ne tue la fonction (10s par défaut sur le plan Hobby).
export const maxDuration = 60;

const VALID_TYPES: QuestionType[] = ["true_false", "mcq", "open"];
const VALID_COUNTS = [10, 20, 40, 50, 80, 100];

// Un lot de plus de 20 questions dépasserait la sortie max d'un seul appel
// Groq de façon fiable : on génère par paquets de 20 maximum, chacun
// persisté immédiatement en base. Un appel suivant sur le même lot reprend
// automatiquement là où il s'est arrêté (voir la recherche de lot existant
// ci-dessous), qu'il s'agisse du prochain paquet normal ou d'une reprise
// après un échec réseau/quota en cours de route.
const BATCH_SIZE = 20;

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

  const model = textModel();

  // Un lot de questions n'est jamais régénéré automatiquement : si un lot
  // identique (même document, type, nombre) existe déjà, on reprend sa
  // génération s'il est incomplet, ou on le renvoie tel quel s'il est déjà
  // complet — jamais un nouvel appel au modèle dans ce cas.
  let questionSet = (
    await supabase
      .from("question_sets")
      .select("*")
      .eq("document_id", id)
      .eq("question_type", questionType)
      .eq("requested_count", count)
      .maybeSingle()
  ).data;

  if (!questionSet) {
    const { data: created, error: setError } = await supabase
      .from("question_sets")
      .insert({
        document_id: id,
        subject_id: document.subject_id,
        user_id: user.id,
        question_type: questionType,
        requested_count: count,
        model_used: model,
      })
      .select()
      .single();

    if (setError || !created) {
      return NextResponse.json({ error: "Impossible d'enregistrer le lot de questions." }, { status: 500 });
    }
    questionSet = created;
  }

  const { count: existingCount } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("question_set_id", questionSet.id);

  const alreadyGenerated = existingCount ?? 0;

  if (alreadyGenerated >= count) {
    const { data: allQuestions } = await supabase
      .from("questions")
      .select("*")
      .eq("question_set_id", questionSet.id)
      .order("order_index", { ascending: true });

    return NextResponse.json({
      questionSet,
      newQuestions: [],
      questions: allQuestions ?? [],
      generatedCount: count,
      totalCount: count,
      done: true,
    });
  }

  const remaining = count - alreadyGenerated;
  const batchSize = Math.min(remaining, BATCH_SIZE);

  try {
    const raw = await generateChat({
      model,
      messages: [
        {
          role: "user",
          content: `${buildQuestionsPrompt(questionType, batchSize)}\n\nTexte du cours :\n"""\n${document.extracted_text.slice(0, 60000)}\n"""`,
        },
      ],
      jsonMode: true,
      maxTokens: 8192,
    });

    let payload: { questions: RawQuestion[] };
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Réponse du modèle invalide, réessaie." },
        { status: 502 }
      );
    }

    const rawQuestions = payload.questions;
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return NextResponse.json(
        { error: "Réponse du modèle incomplète, réessaie." },
        { status: 502 }
      );
    }

    const rowsToInsert = rawQuestions.slice(0, batchSize).map((q, index) => ({
      question_set_id: questionSet.id,
      subject_id: document.subject_id,
      user_id: user.id,
      question_type: questionType,
      prompt: q.prompt,
      options: questionType === "mcq" ? q.options : null,
      correct_answer: questionType === "open" ? null : q.correct_answer,
      explanation: q.explanation ?? null,
      order_index: alreadyGenerated + index,
    }));

    const { data: newQuestions, error: questionsError } = await supabase
      .from("questions")
      .insert(rowsToInsert)
      .select();

    if (questionsError || !newQuestions) {
      return NextResponse.json({ error: "Impossible d'enregistrer les questions." }, { status: 500 });
    }

    const generatedCount = alreadyGenerated + newQuestions.length;

    return NextResponse.json({
      questionSet,
      newQuestions,
      generatedCount,
      totalCount: count,
      done: generatedCount >= count,
    });
  } catch (err) {
    if (err instanceof GroqQuotaError) {
      return NextResponse.json(
        { error: err.message, questionSet, generatedCount: alreadyGenerated, totalCount: count },
        { status: 429 }
      );
    }
    if (err instanceof GroqOverloadedError) {
      return NextResponse.json(
        { error: err.message, questionSet, generatedCount: alreadyGenerated, totalCount: count },
        { status: 503 }
      );
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json(
      { error: message, questionSet, generatedCount: alreadyGenerated, totalCount: count },
      { status: 500 }
    );
  }
}
