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

/** Extrait les vrais schémas/images (JPEG/PNG) intégrés au PDF sous forme de Data URIs */
function extractImagesFromPdfBuffer(buffer: Buffer): string[] {
  const images: string[] = [];
  try {
    let offset = 0;
    // 1. Extraction des JPEG valides (début \xFF\xD8\xFF et présence signature JFIF ou Exif)
    while (offset < buffer.length - 30 && images.length < 5) {
      if (
        buffer[offset] === 0xff &&
        buffer[offset + 1] === 0xd8 &&
        buffer[offset + 2] === 0xff
      ) {
        const start = offset;
        let end = -1;
        for (let i = start + 3; i < Math.min(start + 2000000, buffer.length - 1); i++) {
          if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) {
            end = i + 2;
            break;
          }
        }
        if (end !== -1) {
          const imgBuffer = buffer.subarray(start, end);
          // Vérification stricte de l'entête magique JPEG (JFIF ou Exif)
          const headerHex = imgBuffer.subarray(0, 30).toString('hex').toLowerCase();
          const isValidJpegHeader = headerHex.includes('4a464946') || headerHex.includes('45786966') || headerHex.startsWith('ffd8ffe0') || headerHex.startsWith('ffd8ffe1');

          if (imgBuffer.length > 5000 && isValidJpegHeader) {
            const base64 = imgBuffer.toString('base64');
            console.log(`[PDF_IMAGES] Image JPEG valide trouvée ! Taille: ${imgBuffer.length} octets`);
            images.push(`data:image/jpeg;base64,${base64}`);
          }
          offset = end;
          continue;
        }
      }
      offset++;
    }

    // 2. Extraction des PNG valides (\x89PNG\r\n\x1a\n)
    if (images.length < 3) {
      offset = 0;
      while (offset < buffer.length - 16 && images.length < 5) {
        if (
          buffer[offset] === 0x89 &&
          buffer[offset + 1] === 0x50 &&
          buffer[offset + 2] === 0x4e &&
          buffer[offset + 3] === 0x47 &&
          buffer[offset + 4] === 0x0d &&
          buffer[offset + 5] === 0x0a &&
          buffer[offset + 6] === 0x1a &&
          buffer[offset + 7] === 0x0a
        ) {
          const start = offset;
          let end = -1;
          for (let i = start + 8; i < Math.min(start + 2000000, buffer.length - 4); i++) {
            if (
              buffer[i] === 0x49 &&
              buffer[i + 1] === 0x45 &&
              buffer[i + 2] === 0x4e &&
              buffer[i + 3] === 0x44
            ) {
              end = i + 8;
              break;
            }
          }
          if (end !== -1) {
            const imgBuffer = buffer.subarray(start, end);
            if (imgBuffer.length > 5000) {
              const base64 = imgBuffer.toString('base64');
              console.log(`[PDF_IMAGES] Image PNG valide trouvée ! Taille: ${imgBuffer.length} octets`);
              images.push(`data:image/png;base64,${base64}`);
            }
            offset = end;
            continue;
          }
        }
        offset++;
      }
    }
  } catch (err) {
    console.error('[PDF_IMAGES] Erreur lors de l\'extraction d\'images:', err);
  }

  console.log(`[PDF_IMAGES] Total schémas valides extraits: ${images.length}`);
  return images;
}

export async function POST(request: NextRequest) {
  console.log('[COURSE_CARDS_API] Demande de génération de cartes de cours');

  try {
    let courseText = '';
    let courseTitle = 'Mon Cours';
    let extractedImages: string[] = [];

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

      // Extraction des schémas/images
      extractedImages = extractImagesFromPdfBuffer(buffer);

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

    // Tronque si le document est extrêmement long
    const truncatedText = courseText.slice(0, 15000);

    console.log('[COURSE_CARDS_API] Analyse du texte de cours (longueur:', truncatedText.length, 'caractères)');

    const hasImagesPrompt = extractedImages.length > 0
      ? `- ${extractedImages.length} schémas/illustrations ont été extraits du document PDF (index de 0 à ${extractedImages.length - 1}). Si une question concerne la lecture, le repérage ou l'analyse d'un schéma du cours, inclut le champ \`imageIndex: N\` (ex: \`imageIndex: 0\`).`
      : '';

    const prompt = `
Tu es un professeur et créateur de contenu pédagogique expert.
Analyse le cours suivant et génère un jeu complet de cartes de révision. Chaque carte servira à la fois de Flash Card (Question / Réponse courte) ET de question de Quiz (QCM 4 options).

Titre du cours : ${courseTitle}

Extrait du cours :
${truncatedText}

Règles OBLIGATOIRES :
- Génère entre 6 et 10 questions pertinentes couvrant l'ensemble des notions importantes de ce cours.
${hasImagesPrompt}
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
      "explanation": "Explication courte.",
      "imageIndex": 0
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

    // Formatage des questions avec réattribution des images de schémas
    const formattedQuestions = data.questions.map((q: any, i: number) => {
      let imageUrl: string | undefined = undefined;

      if (typeof q.imageIndex === 'number' && extractedImages[q.imageIndex]) {
        imageUrl = extractedImages[q.imageIndex];
      }

      return {
        id: q.id || `q_${Date.now()}_${i}`,
        question: q.question,
        answer: q.answer || q.options?.[q.correctIndex || 0] || '',
        options: q.options || [q.answer, 'Option B', 'Option C', 'Option D'],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation || '',
        imageUrl: imageUrl,
      };
    });

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
