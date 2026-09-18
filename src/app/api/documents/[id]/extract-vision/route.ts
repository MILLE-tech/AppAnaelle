import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateContent, GeminiQuotaError, GeminiOverloadedError } from "@/lib/gemini/client";

// Laisse le temps aux retries (429/503) de Gemini d'aboutir avant que
// Vercel ne tue la fonction (10s par défaut sur le plan Hobby).
export const maxDuration = 60;

interface ImagePayload {
  base64: string;
  mimeType: string;
}

const EXTRACTION_PROMPT = `Transcris fidèlement tout le texte visible sur ces pages de cours (en français).
Ne résume pas, ne reformule pas, ne commente pas : recopie le contenu tel quel.
Conserve la structure (titres, listes, tableaux) sous forme de texte brut lisible.
Si une portion est totalement illisible, ignore-la sans l'inventer.
Réponds uniquement avec le texte transcrit, sans préambule.`;

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

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", id)
    .single();

  if (documentError || !document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const { images } = (await request.json()) as { images: ImagePayload[] };
  if (!images?.length) {
    return NextResponse.json({ error: "Aucune image fournie." }, { status: 400 });
  }
  if (images.length > 20) {
    return NextResponse.json(
      { error: "Trop de pages pour une extraction en un seul appel (max 20)." },
      { status: 400 }
    );
  }

  try {
    const text = await generateContent({
      parts: [
        { text: EXTRACTION_PROMPT },
        ...images.map((image) => ({
          inlineData: { mimeType: image.mimeType, data: image.base64 },
        })),
      ],
      responseMimeType: "text/plain",
      maxOutputTokens: 16384,
    });

    return NextResponse.json({ text });
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
