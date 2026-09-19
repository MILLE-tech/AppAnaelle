"use client";

export interface GeneratedQuestionSet {
  id: string;
  document_id: string;
  question_type: string;
  requested_count: number;
}

export interface GenerateProgress {
  generatedCount: number;
  totalCount: number;
}

// Génère un lot de questions par paquets de 20 maximum (limite de sortie
// fiable d'un appel Groq). Chaque paquet est persisté en base côté serveur
// avant de renvoyer la main ici, donc relancer cette fonction après une
// erreur reprend automatiquement là où ça s'est arrêté (le serveur retrouve
// le lot existant et compte les questions déjà générées).
export async function generateQuestionsInBatches(
  documentId: string,
  questionType: string,
  count: number,
  onProgress: (progress: GenerateProgress) => void
): Promise<GeneratedQuestionSet> {
  let done = false;
  let questionSet: GeneratedQuestionSet | null = null;

  while (!done) {
    const response = await fetch(`/api/documents/${documentId}/generate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionType, count }),
    });
    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error ?? "Échec de la génération des questions.");
    }

    questionSet = json.questionSet;
    onProgress({ generatedCount: json.generatedCount, totalCount: json.totalCount });
    done = json.done;
  }

  if (!questionSet) throw new Error("Échec de la génération des questions.");
  return questionSet;
}
