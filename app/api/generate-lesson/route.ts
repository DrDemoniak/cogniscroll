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
Tu es un professeur passionné et vulgarisateur expert. ${promptIntro}

Thématique : ${theme}
Sujet précis : ${topic}

Règles OBLIGATOIRES :
- Contenu en français uniquement
- Ton accessible et engageant (pas trop académique), comme un article de magazine intelligent
- Inclure des anecdotes, faits surprenants, chiffres clés
- Durée de lecture cible : 5 à 7 minutes (environ 600 mots de contenu au total)
- 4 sections, chacune avec du contenu substantiel (minimum 120 mots par section)
- Chaque section avec 3 à 4 points-clés concrets et mémorables
- Sources réelles et vérifiables (Wikipedia, encyclopédies, institutions reconnues)
- Recherche YouTube pertinente pour approfondir

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
