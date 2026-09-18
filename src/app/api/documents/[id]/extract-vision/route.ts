import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateChat, GroqQuotaError, GroqOverloadedError, visionModel } from "@/lib/groq/client";
import { EXTRACTION_PROMPT } from "@/lib/groq/prompts";

// Laisse le temps aux retries (429/5xx) de Groq d'aboutir avant que
// Vercel ne tue la fonction (10s par défaut sur le plan Hobby).
export const maxDuration = 60;

interface ImagePayload {
  base64: string;
  mimeType: string;
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
  if (images.length > 5) {
    return NextResponse.json(
      { error: "Trop de pages pour une extraction en un seul appel (max 5)." },
      { status: 400 }
    );
  }

  try {
    const text = await generateChat({
      model: visionModel(),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            ...images.map((image) => ({
              type: "image_url" as const,
              image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
            })),
          ],
        },
      ],
      maxTokens: 8192,
    });

    return NextResponse.json({ text });
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
