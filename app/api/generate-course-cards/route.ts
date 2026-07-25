/**
 * app/api/generate-course-cards/route.ts
 * Route API pour analyser un cours (PDF ou texte) et générer des questions/flashcards.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-ignore
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.5,
    maxOutputTokens: 2048,
  },
});

export async function POST(request: NextRequest) {
  console.log('[COURSE_CARDS_API] Demande de génération de cartes de cours');

  try {
    let courseText = '';
    let courseTitle = 'Mon Cours';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const titleInput = formData.get('title') as string | null;

      if (titleInput && titleInput.trim()) {
        courseTitle = titleInput.trim();
      }

      if (!file) {
        return NextResponse.json(
          { error: 'Aucun fichier PDF fourni' },
          { status: 400 }
        );
      }

      // Format par défaut de nom si non fourni
      if (!titleInput && file.name) {
        courseTitle = file.name.replace(/\.pdf$/i, '');
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      console.log('[COURSE_CARDS_API] Extrait du PDF:', file.name, 'Taille:', buffer.length, 'octets');

      const parsed = await pdfParse(buffer);
      courseText = parsed.text || '';

      if (!courseText.trim()) {
        return NextResponse.json(
          { error: 'Impossible d\'extraire du texte de ce fichier PDF' },
          { status: 400 }
        );
      }
    } else {
      const body = await request.json();
      courseText = body.text || '';
      courseTitle = body.title || 'Mon Cours';
    }

    if (!courseText.trim()) {
      return NextResponse.json(
        { error: 'Le contenu du cours est vide' },
        { status: 400 }
      );
    }

    // Tronque si le document est extrêmement long (garder les ~15000 premiers caractères pour Gemini)
    const truncatedText = courseText.slice(0, 15000);

    console.log('[COURSE_CARDS_API] Analyse du texte de cours (longueur:', truncatedText.length, 'caractères)');

    const prompt = `
Tu es un professeur et créateur de contenu pédagogique expert.
Analyse le cours suivant et génère un jeu complet de cartes de révision. Chaque carte servira à la fois de Flash Card (Question / Réponse courte) ET de question de Quiz (QCM 4 options).

Titre du cours : ${courseTitle}

Extrait du cours :
${truncatedText}

Règles OBLIGATOIRES :
- Génère entre 6 et 10 questions pertinentes couvrant l'ensemble des notions importantes de ce cours.
- Pour chaque question :
  - "question" : Question claire et précise.
  - "answer" : Réponse exacte et concise (pour le verso de la flash card).
  - "options" : Tableau de 4 propositions (A, B, C, D) où 1 seule est la bonne réponse.
  - "correctIndex" : Index (0 à 3) de la bonne réponse dans le tableau options.
  - "explanation" : Courte explication pédagogique.
- En FRANÇAIS uniquement.

Retourne UNIQUEMENT un JSON valide (sans markdown, pas de \`\`\`json) avec cette structure :
{
  "title": "${courseTitle}",
  "questions": [
    {
      "id": "q1",
      "question": "Quelle est la définition de...",
      "answer": "C'est...",
      "options": ["C'est...", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Explication courte."
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
      console.error('[COURSE_CARDS_API] Erreur parsing JSON:', responseText.slice(0, 200));
      return NextResponse.json(
        { error: 'Réponse JSON invalide de l\'IA' },
        { status: 500 }
      );
    }

    if (!data.questions || !Array.isArray(data.questions)) {
      return NextResponse.json(
        { error: 'Structure de questions invalide' },
        { status: 500 }
      );
    }

    // Ajoute un ID unique à chaque question si manquant
    const formattedQuestions = data.questions.map((q: any, i: number) => ({
      id: q.id || `q_${Date.now()}_${i}`,
      question: q.question,
      answer: q.answer || q.options?.[q.correctIndex || 0] || '',
      options: q.options || [q.answer, 'Option B', 'Option C', 'Option D'],
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      explanation: q.explanation || '',
    }));

    console.log('[COURSE_CARDS_API] Succès !', formattedQuestions.length, 'questions générées.');

    return NextResponse.json({
      title: data.title || courseTitle,
      questions: formattedQuestions,
    });

  } catch (err: any) {
    console.error('[COURSE_CARDS_API] Erreur serveur:', err?.message);
    return NextResponse.json(
      { error: 'Erreur lors du traitement du document ou de la génération' },
      { status: 500 }
    );
  }
}
