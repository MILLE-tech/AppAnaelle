import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateChat, GroqQuotaError, GroqOverloadedError, textModel } from "@/lib/groq/client";
import { SHEET_GENERATION_PROMPT } from "@/lib/groq/prompts";

// Laisse le temps aux retries (429/5xx) de Groq d'aboutir avant que
// Vercel ne tue la fonction (10s par défaut sur le plan Hobby).
export const maxDuration = 60;

interface SheetPayload {
  title: string;
  content_markdown: string;
}

export async function POST(
  _request: Request,
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

  // Une fiche n'est jamais régénérée automatiquement : si elle existe déjà,
  // on la renvoie telle quelle plutôt que de consommer à nouveau le quota.
  const { data: existingSheet } = await supabase
    .from("revision_sheets")
    .select("*")
    .eq("document_id", id)
    .maybeSingle();

  if (existingSheet) {
    return NextResponse.json({ sheet: existingSheet });
  }

  const model = textModel();

  try {
    const raw = await generateChat({
      model,
      messages: [
        {
          role: "user",
          content: `${SHEET_GENERATION_PROMPT}\n\nTexte du cours :\n"""\n${document.extracted_text.slice(0, 60000)}\n"""`,
        },
      ],
      jsonMode: true,
      maxTokens: 4096,
    });

    let payload: SheetPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Réponse du modèle invalide, réessaie." },
        { status: 502 }
      );
    }

    if (!payload.title || !payload.content_markdown) {
      return NextResponse.json(
        { error: "Réponse du modèle incomplète, réessaie." },
        { status: 502 }
      );
    }

    const { data: sheet, error: insertError } = await supabase
      .from("revision_sheets")
      .insert({
        document_id: id,
        subject_id: document.subject_id,
        user_id: user.id,
        title: payload.title,
        content_markdown: payload.content_markdown,
        model_used: model,
      })
      .select()
      .single();

    if (insertError || !sheet) {
      return NextResponse.json(
        { error: "Impossible d'enregistrer la fiche générée." },
        { status: 500 }
      );
    }

    return NextResponse.json({ sheet });
  } catch (err) {
    if (err instanceof GroqQuotaError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof GroqOverloadedError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
