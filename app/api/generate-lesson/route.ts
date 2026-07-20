/**
 * app/api/generate-lesson/route.ts
 * Route API sécurisée pour générer une fiche de connaissance via Gemini.
 * La clé API reste côté serveur — jamais exposée au client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialisation du client Gemini avec la clé serveur
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.75,
    maxOutputTokens: 2048,
  },
});

export async function POST(request: NextRequest) {
  console.log('[API] generate-lesson appelé');

  try {
    const body = await request.json();
    const { theme, topic, themeId } = body;

    // Validation des paramètres
    if (!theme || !topic) {
      return NextResponse.json(
        { error: 'Paramètres manquants : theme et topic requis' },
        { status: 400 }
      );
    }

    console.log(`[API] Génération leçon — thème: ${theme}, sujet: ${topic}`);

    const prompt = `
Tu es un professeur passionné et vulgarisateur expert. Génère une fiche de connaissance éducative en FRANÇAIS sur le sujet suivant.

Thématique : ${theme}
Sujet précis : ${topic}

Règles OBLIGATOIRES :
- Contenu en français uniquement
- Ton accessible et engageant (pas trop académique)
- Inclure des anecdotes et faits surprenants
- Durée de lecture : 3 à 5 minutes
- Chaque section avec des points-clés concrets

Retourne UNIQUEMENT un JSON valide avec exactement cette structure (sans markdown) :
{
  "title": "Titre accrocheur et original de la fiche",
  "theme": "${themeId || theme.toLowerCase()}",
  "topic": "${topic}",
  "estimatedMinutes": 4,
  "difficulty": "débutant",
  "sections": [
    {
      "title": "Titre de la section 1",
      "content": "Contenu détaillé et intéressant de la section (2-3 paragraphes)",
      "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3"]
    },
    {
      "title": "Titre de la section 2",
      "content": "Contenu de la section 2",
      "keyPoints": ["Point clé 1", "Point clé 2"]
    },
    {
      "title": "Titre de la section 3",
      "content": "Contenu de la section 3",
      "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3"]
    }
  ],
  "didYouKnow": "Un fait vraiment surprenant et mémorable lié au sujet",
  "summary": "Un résumé de 2-3 phrases qui synthétise les points essentiels de la fiche"
}

La difficulté doit être exactement "débutant", "intermédiaire" ou "avancé" selon la complexité.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse du JSON retourné par Gemini
    let lessonData;
    try {
      lessonData = JSON.parse(text);
    } catch {
      console.error('[API] Erreur parsing JSON Gemini:', text.slice(0, 200));
      return NextResponse.json(
        { error: 'Réponse Gemini invalide, réessaie' },
        { status: 500 }
      );
    }

    console.log('[API] Leçon générée avec succès:', lessonData.title);

    return NextResponse.json({ lesson: lessonData });
  } catch (err: any) {
    console.error('[API] Erreur generate-lesson:', err?.message);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la leçon' },
      { status: 500 }
    );
  }
}
