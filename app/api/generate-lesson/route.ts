/**
 * app/api/generate-lesson/route.ts
 * Route API sécurisée pour générer une fiche de connaissance via Gemini.
 * La clé API reste côté serveur — jamais exposée au client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialisation du client Gemini avec la clé serveur
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  safetySettings,
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
    const { theme, topic, themeId, mode } = body;

    // Validation des paramètres
    if (!theme || !topic) {
      return NextResponse.json(
        { error: 'Paramètres manquants : theme et topic requis' },
        { status: 400 }
      );
    }

    console.log(`[API] Génération leçon — thème: ${theme}, sujet: ${topic}, mode: ${mode || 'standard'}`);

    // Si on demande un approfondissement, on adapte légèrement le prompt
    const promptIntro = mode === 'approfondi' 
      ? `Génère une fiche de connaissance éducative TRES APPROFONDIE (niveau avancé) en FRANÇAIS sur le sujet suivant. C'est une suite d'un article de base.`
      : `Génère une fiche de connaissance éducative approfondie en FRANÇAIS sur le sujet suivant.`;

    const prompt = `
Tu es un expert technique et analytique. ${promptIntro}

Thématique : ${theme}
Sujet précis : ${topic}

[CONSIGNES DE STYLE ET DE RÉDACTION - STRICTEMENT OBLIGATOIRES]
Ton objectif principal est de maximiser la densité d'information. Tu dois me fournir une réponse riche, complète, factuelle et technique. Adopte un style direct, chirurgical et professionnel, en éliminant toute formulation artificielle, pompeuse ou superflue.

1. CE QU'IL FAUT ABSOLUMENT ÉVITER (Bannissement total) :
- Le verbiage et les tics de langage : N'utilise JAMAIS les formulations suivantes (ni leurs synonymes) : "À l'ère de...", "Dans un monde de plus en plus...", "Au-delà de...", "Ce n'est pas seulement X, c'est un véritable Y", "Il est crucial/essentiel de se rappeler/noter que...", "Un véritable catalyseur / pilier / levier...", "L'architecture invisible / la toile de fond / la danse complexe de...".
- L'exagération et le ton promotionnel : Reste d'une neutralité absolue. Bannis les adjectifs émotionnels ou grandiloquents (ex: "incroyable", "révolutionnaire", "fascinant", "redoutable").
- Les phrases de remplissage : Ne fais aucune phrase d'introduction annonçant ce que tu vas dire. Ne fais aucune phrase de conclusion moralisatrice ou qui résume ce qui vient d'être lu.
- Les métaphores filées et la poésie d'entreprise : Garde un langage littéral. Ne parle pas pour ne rien dire.

2. CE QU'IL FAUT FAIRE :
- Droit au but : La toute première phrase doit être le début direct de l'explication ou de l'analyse.
- Densité de l'information : Chaque proposition doit apporter un fait, une donnée, un argument concret ou une étape logique. Si une phrase peut être supprimée sans altérer la compréhension technique, supprime-la.
- Précision sémantique : Utilise les termes techniques exacts.
- Structure : Privilégie une hiérarchie stricte pour une lecture rapide et efficace.

Contraintes techniques :
- 4 sections avec chacune un contenu très dense (minimum 120 mots par section) et 3 à 4 points-clés très spécifiques (pas de généralités).
- Sources réelles et factuelles (Wikipedia, institutions).

Retourne UNIQUEMENT un JSON valide avec exactement cette structure (sans markdown, pas de \`\`\`json) :
{
  "title": "Titre accrocheur et original de la fiche",
  "theme": "${themeId || theme.toLowerCase()}",
  "topic": "${topic}",
  "estimatedMinutes": 6,
  "difficulty": "${mode === 'approfondi' ? 'avancé' : 'débutant'}",
  "imageKeywords": ["mot-clé image 1 en anglais", "mot-clé image 2 en anglais"],
  "sections": [
    {
      "title": "Titre de la section 1",
      "content": "Contenu détaillé et intéressant de la section (minimum 120 mots, 2-3 paragraphes denses, avec exemples concrets et chiffres si pertinent)",
      "keyPoints": ["Point clé 1 mémorable", "Point clé 2 avec un fait précis", "Point clé 3 actionnable", "Point clé 4 surprenant"]
    },
    {
      "title": "Titre de la section 2",
      "content": "Contenu substantiel de 120+ mots avec développements et nuances",
      "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3"]
    },
    {
      "title": "Titre de la section 3",
      "content": "Contenu substantiel de 120+ mots",
      "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3", "Point clé 4"]
    },
    {
      "title": "Titre de la section 4",
      "content": "Contenu substantiel de 120+ mots",
      "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3"]
    }
  ],
  "didYouKnow": "Un fait vraiment surprenant, inattendu et mémorable lié au sujet (2-3 phrases)",
  "summary": "Un résumé de 3-4 phrases qui synthétise les points essentiels et donne envie d'aller plus loin",
  "sources": [
    { "title": "Titre de la source 1", "url": "https://fr.wikipedia.org/..." },
    { "title": "Titre de la source 2", "url": "https://..." }
  ],
  "youtubeQuery": "recherche youtube en français sur le sujet pour approfondir"
}

La difficulté doit être exactement "débutant", "intermédiaire" ou "avancé" selon la complexité.
imageKeywords : 2 mots-clés en ANGLAIS pour chercher des images pertinentes sur ce sujet (ex: "black hole space", "french revolution painting").
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse du JSON retourné par Gemini
    let lessonData: any;
    try {
      const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      lessonData = JSON.parse(cleanText);
    } catch {
      console.error('[API] Erreur parsing JSON Gemini:', text.slice(0, 200));
      return NextResponse.json(
        { error: 'Réponse Gemini invalide, réessaie' },
        { status: 500 }
      );
    }

    console.log('[API] Leçon générée:', lessonData.title, '| keywords:', lessonData.imageKeywords);

    // ── Enrichissement avec images Pexels ────────────────────────────────────
    // On fetch 2 images en parallèle pour les mots-clés fournis par Gemini
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (pexelsKey && lessonData.imageKeywords?.length > 0) {
      try {
        const imagePromises = lessonData.imageKeywords.slice(0, 2).map(async (keyword: string) => {
          const res = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`,
            { headers: { Authorization: pexelsKey } }
          );
          if (!res.ok) return null;
          const data = await res.json();
          const photo = data.photos?.[0];
          if (!photo) return null;
          return {
            url: photo.src.large,           // URL image HD
            thumb: photo.src.medium,        // URL miniature
            alt: photo.alt || keyword,
            credit: photo.photographer,
            creditUrl: photo.photographer_url,
          };
        });

        const images = (await Promise.all(imagePromises)).filter(Boolean);
        lessonData.images = images;
        console.log(`[API] ${images.length} image(s) Pexels ajoutée(s)`);
      } catch (pexelsErr) {
        // Non bloquant : on continue sans images si Pexels échoue
        console.warn('[API] Pexels unavailable, continuing without images:', pexelsErr);
        lessonData.images = [];
      }
    } else {
      lessonData.images = [];
    }

    return NextResponse.json({ lesson: lessonData });
  } catch (err: any) {
    console.error('[API] Erreur generate-lesson:', err?.message);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la leçon' },
      { status: 500 }
    );
  }
}
