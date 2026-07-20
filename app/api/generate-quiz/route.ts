/**
 * app/api/generate-quiz/route.ts
 * Route API sécurisée pour générer un quiz QCM à partir d'une fiche de connaissance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.5,
    maxOutputTokens: 1024,
  },
});

export async function POST(request: NextRequest) {
  console.log('[API] generate-quiz appelé');

  try {
    const body = await request.json();
    const { lessonTitle, lessonSummary, lessonSections } = body;

    if (!lessonTitle || !lessonSections) {
      return NextResponse.json(
        { error: 'Paramètres manquants : lessonTitle et lessonSections requis' },
        { status: 400 }
      );
    }

    // Construit un résumé de la leçon pour le contexte Gemini
    const lessonContext = lessonSections
      .map((s: any) => `${s.title}: ${s.content.slice(0, 300)}`)
      .join('\n');

    console.log('[API] Génération quiz pour:', lessonTitle);

    const prompt = `
Tu es un créateur de quiz pédagogique expert. Génère 4 questions à choix multiples en FRANÇAIS basées sur cette leçon.

Titre de la leçon : ${lessonTitle}
Résumé : ${lessonSummary || ''}
Contenu :
${lessonContext}

Règles OBLIGATOIRES :
- 4 questions exactement
- 4 options de réponse chacune (A, B, C, D)
- Exactement 1 bonne réponse par question
- Les mauvaises réponses doivent être plausibles (pas triviales)
- Explication claire et pédagogique pour la bonne réponse
- Questions variées (compréhension, détail, application)
- En FRANÇAIS uniquement

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "questions": [
    {
      "question": "La question posée ?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Explication détaillée de pourquoi cette réponse est correcte, et éventuellement pourquoi les autres sont incorrectes."
    }
  ]
}

correctIndex est l'index (0-3) de la bonne réponse dans le tableau options.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let quizData;
    try {
      quizData = JSON.parse(text);
    } catch {
      console.error('[API] Erreur parsing quiz JSON:', text.slice(0, 200));
      return NextResponse.json(
        { error: 'Réponse quiz invalide' },
        { status: 500 }
      );
    }

    // Validation basique
    if (!quizData.questions || quizData.questions.length < 2) {
      return NextResponse.json(
        { error: 'Quiz généré invalide' },
        { status: 500 }
      );
    }

    console.log('[API] Quiz généré avec succès:', quizData.questions.length, 'questions');

    return NextResponse.json({ quiz: quizData });
  } catch (err: any) {
    console.error('[API] Erreur generate-quiz:', err?.message);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du quiz' },
      { status: 500 }
    );
  }
}
