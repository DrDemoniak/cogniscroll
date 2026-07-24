/**
 * app/api/generate-flashcards/route.ts
 * Route API pour générer des Flash Cards dynamiques recto/verso à partir des leçons récentes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.6,
    maxOutputTokens: 1536,
  },
});

export async function POST(request: NextRequest) {
  console.log('[FLASHCARDS_API] Demande de génération de flashcards dynamiques');

  try {
    const body = await request.json();
    const { recentLessons } = body;

    if (!recentLessons || !Array.isArray(recentLessons) || recentLessons.length === 0) {
      return NextResponse.json(
        { error: 'Paramètre récentLessons requis' },
        { status: 400 }
      );
    }

    const lessonsSummary = recentLessons.map((l: any, i: number) => {
      const title = l.content?.title || l.topic || `Leçon ${i + 1}`;
      const theme = l.theme || '';
      const summary = l.content?.summary || '';
      const keyPoints = l.content?.sections
        ?.flatMap((s: any) => s.keyPoints || [])
        .slice(0, 3)
        .join('; ') || '';

      return `- ${title} (${theme}) : ${summary}. Points clés: ${keyPoints}`;
    }).join('\n');

    console.log('[FLASHCARDS_API] Génération pour', recentLessons.length, 'leçons');

    const prompt = `
Tu es un créateur de cartes mémoires (Flash Cards) éducatives expert.
Génère 6 Flash Cards en FRANÇAIS basées sur ces leçons révisées récemment :

${lessonsSummary}

Règles OBLIGATOIRES :
- Exactement 6 cartes mémoires
- Pour chaque carte, fournis une question directe au recto, et la réponse clé exacte au verso avec une courte explication complémentaire.
- Fournis également 4 options (A, B, C, D) où la bonne réponse est dans le tableau options à l'index \`correctIndex\` (0 à 3).
- Assure-toi que le sujet est tiré des leçons ci-dessus.
- En FRANÇAIS uniquement.

Retourne UNIQUEMENT un JSON valide (sans markdown, pas de \`\`\`json) avec cette structure :
{
  "flashcards": [
    {
      "question": "Question claire posée au recto ?",
      "answer": "Réponse exacte et concise au verso",
      "options": ["Réponse exacte", "Option incorrecte 1", "Option incorrecte 2", "Option incorrecte 3"],
      "correctIndex": 0,
      "explanation": "Explication pédagogique courte et concrète.",
      "theme": "Thème de la leçon concernée (ex: Sciences, Histoire, Psychologie...)",
      "lessonTitle": "Titre de la leçon source"
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[FLASHCARDS_API] Erreur parsing JSON:', text.slice(0, 200));
      return NextResponse.json(
        { error: 'Réponse flashcards invalide' },
        { status: 500 }
      );
    }

    if (!data.flashcards || !Array.isArray(data.flashcards)) {
      return NextResponse.json(
        { error: 'Structure de flashcards invalide' },
        { status: 500 }
      );
    }

    console.log('[FLASHCARDS_API] Génération réussie de', data.flashcards.length, 'flashcards');
    return NextResponse.json({ flashcards: data.flashcards });

  } catch (err: any) {
    console.error('[FLASHCARDS_API] Erreur serveur:', err?.message);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la génération des flashcards' },
      { status: 500 }
    );
  }
}
