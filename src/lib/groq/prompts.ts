export const SHEET_GENERATION_PROMPT = `Tu es un assistant pédagogique pour une étudiante en BTS SAM (Support à l'Action Managériale).
À partir du texte de cours ci-dessous, rédige une fiche de révision structurée, claire et synthétique, en français.

La fiche doit suivre EXACTEMENT cette structure en Markdown (utilise des titres ##) :
## Notions clés
Liste à puces des notions essentielles du cours.

## Définitions
Liste des termes importants avec leur définition, sous la forme "**Terme** : définition".

## Points à retenir
Liste à puces des idées ou méthodes à retenir absolument pour un examen.

## Exemples
Un ou deux exemples concrets tirés ou inspirés du cours, illustrant les notions.

Consignes :
- Reste fidèle au contenu du cours, n'invente pas d'informations absentes.
- Sois synthétique : privilégie des listes à puces courtes plutôt que des paragraphes longs.
- N'ajoute aucun texte en dehors de la structure demandée (pas de préambule, pas de conclusion).

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, de la forme exacte :
{"title": "titre court (5 à 8 mots) résumant le sujet", "content_markdown": "la fiche complète au format Markdown décrit ci-dessus"}`;

const QUESTION_TYPE_INSTRUCTIONS: Record<"true_false" | "mcq" | "open", string> = {
  true_false: `Génère des questions VRAI/FAUX. Pour chaque question :
- "prompt" : une affirmation claire, vraie ou fausse, basée sur le cours.
- "correct_answer" : exactement "true" ou "false".
- "options" : laisse un tableau vide [].
- "explanation" : une phrase expliquant pourquoi l'affirmation est vraie ou fausse.`,
  mcq: `Génère des questions à choix multiples (QCM). Pour chaque question :
- "prompt" : l'énoncé de la question.
- "options" : un tableau de EXACTEMENT 4 propositions, une seule correcte, plausibles et non triviales.
- "correct_answer" : l'index (sous forme de chaîne "0", "1", "2" ou "3") de la bonne proposition dans "options".
- "explanation" : une phrase expliquant pourquoi cette réponse est correcte.`,
  open: `Génère des questions ouvertes à rédiger. Pour chaque question :
- "prompt" : une question qui demande une réponse rédigée (pas un simple mot).
- "options" : laisse un tableau vide [].
- "correct_answer" : laisse une chaîne vide "".
- "explanation" : les éléments de réponse attendus (points clés que doit contenir une bonne réponse), utilisés ensuite pour corriger l'étudiante — sois précis et complet.`,
};

export function buildQuestionsPrompt(
  type: "true_false" | "mcq" | "open",
  count: number
): string {
  return `Tu es un assistant pédagogique pour une étudiante en BTS SAM (Support à l'Action Managériale).
À partir du texte de cours ci-dessous, génère exactement ${count} questions en français pour réviser ce cours.

${QUESTION_TYPE_INSTRUCTIONS[type]}

Consignes générales :
- Base-toi uniquement sur le contenu du cours fourni, n'invente rien d'absent.
- Varie les questions : ne répète pas la même idée sous des formulations différentes.
- Formulations claires et sans ambiguïté.

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, de la forme exacte :
{"questions": [{"prompt": "...", "options": ["...", "...", "...", "..."], "correct_answer": "...", "explanation": "..."}, ...]}
contenant exactement ${count} éléments dans le tableau "questions".`;
}

export function buildOpenGradingPrompt(
  question: string,
  expectedPoints: string,
  studentAnswer: string
): string {
  return `Tu es une correctrice bienveillante pour une étudiante en BTS SAM.
Question posée : "${question}"

Éléments de réponse attendus : "${expectedPoints}"

Réponse de l'étudiante : "${studentAnswer}"

Corrige cette réponse :
- Donne une note sur 10 ("score"), juste et cohérente avec les éléments attendus.
- Rédige un retour ("feedback") bienveillant, jamais cassant, en français : commence par ce qui est réussi, puis indique précisément ce qui manque ou pourrait être amélioré, en 2 à 4 phrases.

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, de la forme exacte :
{"score": 0, "feedback": "..."}`;
}

export const EXTRACTION_PROMPT = `Transcris fidèlement tout le texte visible sur ces pages de cours (en français).
Ne résume pas, ne reformule pas, ne commente pas : recopie le contenu tel quel.
Conserve la structure (titres, listes, tableaux) sous forme de texte brut lisible.
Si une portion est totalement illisible, ignore-la sans l'inventer.
Réponds uniquement avec le texte transcrit, sans préambule.`;
