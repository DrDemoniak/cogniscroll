/**
 * app/api/generate-more-course-questions/route.ts
 * Route API pour générer N questions supplémentaires (1 à 20 max) pour un cours personnalisé.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.6,
    maxOutputTokens: 2048,
  },
});

export async function POST(request: NextRequest) {
  console.log('[GENERATE_MORE_QUESTIONS] Demande de nouvelles questions');

  try {
    const body = await request.json();
    const { courseTitle, existingQuestions, requestedCount } = body;

    if (!courseTitle) {
      return NextResponse.json(
        { error: 'Titre du cours requis' },
        { status: 400 }
      );
    }

    // Sécurise la quantité demandée entre 1 et 20 max
    const count = Math.min(20, Math.max(1, parseInt(requestedCount || '5', 10)));

    // Construit un résumé des questions déjà existantes pour éviter les doublons
    const existingSummary = (existingQuestions || [])
      .map((q: any, i: number) => `- Q${i + 1}: ${q.question}`)
      .slice(-15) // Prendre les 15 dernières questions pour ne pas surcharger le prompt
      .join('\n');

    console.log(`[GENERATE_MORE_QUESTIONS] Génération de ${count} questions pour "${courseTitle}"`);

    const prompt = `
Tu es un professeur expert et concepteur d'examens.
Génère ${count} NOUVELLES questions de révision (Flashcard & QCM 4 options) en FRANÇAIS pour le cours intitulé "${courseTitle}".

Ces nouvelles questions doivent aborder des notions ou aspects complémentaires et éviter de répéter les questions déjà existantes suivantes :
${existingSummary || '(Aucune question existante)'}

Règles OBLIGATOIRES :
- Génère exactement ${count} nouvelles questions.
- Pour chaque question :
  - "question" : Question claire et précise.
  - "answer" : Réponse exacte et concise (pour la flashcard).
  - "options" : Tableau de 4 propositions (A, B, C, D) où 1 seule est la bonne réponse.
  - "correctIndex" : Index (0 à 3) de la bonne réponse dans le tableau options.
  - "explanation" : Courte explication pédagogique.
- En FRANÇAIS uniquement.

Retourne UNIQUEMENT un JSON valide (sans markdown, pas de \`\`\`json) avec cette structure :
{
  "questions": [
    {
      "question": "Question posée ?",
      "answer": "Réponse concise",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Explication rapide."
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[GENERATE_MORE_QUESTIONS] Erreur parsing JSON:', responseText.slice(0, 200));
      return NextResponse.json(
        { error: 'Réponse JSON invalide' },
        { status: 500 }
      );
    }

    if (!data.questions || !Array.isArray(data.questions)) {
      return NextResponse.json(
        { error: 'Structure de questions invalide' },
        { status: 500 }
      );
    }

    const formattedQuestions = data.questions.map((q: any, i: number) => ({
      id: `q_more_${Date.now()}_${i}`,
      question: q.question,
      answer: q.answer || q.options?.[q.correctIndex || 0] || '',
      options: q.options || [q.answer, 'Option B', 'Option C', 'Option D'],
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      explanation: q.explanation || '',
    }));

    console.log(`[GENERATE_MORE_QUESTIONS] Succès : ${formattedQuestions.length} questions générées`);

    return NextResponse.json({
      questions: formattedQuestions,
    });

  } catch (err: any) {
    console.error('[GENERATE_MORE_QUESTIONS] Erreur serveur:', err?.message);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de questions supplémentaires' },
      { status: 500 }
    );
  }
}
