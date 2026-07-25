import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Jimp } from 'jimp';
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

/** Découpe une zone rectangulaire [ymin, xmin, ymax, xmax] (coordonnées 0-1000) dans une Data URI d'image avec Jimp */
async function cropImageWithBoundingBox(
  base64DataUri: string,
  box: [number, number, number, number]
): Promise<string> {
  try {
    const [ymin, xmin, ymax, xmax] = box;
    if (ymin === undefined || xmin === undefined || ymax === undefined || xmax === undefined) {
      return base64DataUri;
    }

    const base64Data = base64DataUri.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const image = await Jimp.read(imageBuffer);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    const cropX = Math.max(0, Math.floor((xmin / 1000) * width));
    const cropY = Math.max(0, Math.floor((ymin / 1000) * height));
    const cropWidth = Math.min(width - cropX, Math.ceil(((xmax - xmin) / 1000) * width));
    const cropHeight = Math.min(height - cropY, Math.ceil(((ymax - ymin) / 1000) * height));

    if (cropWidth > 30 && cropHeight > 30) {
      image.crop({ x: cropX, y: cropY, w: cropWidth, h: cropHeight });
      const croppedBuffer = await image.getBuffer('image/png');
      console.log(`[CROP_IMAGES] Schéma découpé avec succès par Bounding Box Gemini (${cropWidth}x${cropHeight} px) !`);
      return `data:image/png;base64,${croppedBuffer.toString('base64')}`;
    }
  } catch (err) {
    console.error('[CROP_IMAGES] Erreur lors du découpage par Bounding Box:', err);
  }
  return base64DataUri;
}

/** Extrait les vrais schémas/images (JPEG/PNG) intégrés au PDF sous forme de Data URIs */
function extractImagesFromPdfBuffer(buffer: Buffer): string[] {
  const images: string[] = [];
  try {
    let offset = 0;
    // 1. Extraction des JPEG valides (début \xFF\xD8\xFF et fin \xFF\xD9)
    while (offset < buffer.length - 30 && images.length < 6) {
      if (
        buffer[offset] === 0xff &&
        buffer[offset + 1] === 0xd8 &&
        buffer[offset + 2] === 0xff
      ) {
        const start = offset;
        let end = -1;
        for (let i = start + 3; i < Math.min(start + 3000000, buffer.length - 1); i++) {
          if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) {
            end = i + 2;
            break;
          }
        }
        if (end !== -1) {
          const imgBuffer = buffer.subarray(start, end);
          const headerHex = imgBuffer.subarray(0, 40).toString('hex').toLowerCase();
          const isValidJpegHeader =
            headerHex.includes('4a464946') ||
            headerHex.includes('45786966') ||
            headerHex.startsWith('ffd8ffe0') ||
            headerHex.startsWith('ffd8ffe1') ||
            headerHex.startsWith('ffd8ffed') ||
            headerHex.startsWith('ffd8ffee') ||
            headerHex.startsWith('ffd8ffdb');

          if (imgBuffer.length > 4000 && isValidJpegHeader) {
            const base64 = imgBuffer.toString('base64');
            console.log(`[PDF_IMAGES] Image/Schéma JPEG valide extrait (${imgBuffer.length} octets)`);
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
      while (offset < buffer.length - 16 && images.length < 6) {
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
          for (let i = start + 8; i < Math.min(start + 3000000, buffer.length - 4); i++) {
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
            if (imgBuffer.length > 4000) {
              const base64 = imgBuffer.toString('base64');
              console.log(`[PDF_IMAGES] Image/Schéma PNG valide extrait (${imgBuffer.length} octets)`);
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
  console.log('[COURSE_CARDS_API] Demande de génération de cartes de cours (Multimodal PDF & Bounding Box Crop)');

  try {
    let courseText = '';
    let courseTitle = 'Mon Cours';
    let extractedImages: string[] = [];
    let pdfPart: any = null;

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

      if (!titleInput && file.name) {
        courseTitle = file.name.replace(/\.pdf$/i, '');
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      console.log('[COURSE_CARDS_API] Fichier PDF reçu:', file.name, 'Taille:', buffer.length, 'octets');

      // 1. Envoi multimodal direct du PDF à Gemini en InlineData
      pdfPart = {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      };

      // 2. Extraction des schémas/images intégrés au PDF
      extractedImages = extractImagesFromPdfBuffer(buffer);

      // 3. Extraction optionnelle de texte brut via pdf-parse
      try {
        const parsed = await pdfParse(buffer);
        courseText = parsed.text || '';
      } catch (e) {
        console.warn('[COURSE_CARDS_API] pdf-parse n\'a pas pu lire le texte brut, passage en mode 100% multimodal OCR.');
      }
    } else {
      const body = await request.json();
      courseText = body.text || '';
      courseTitle = body.title || 'Mon Cours';
    }

    const hasImagesPrompt = extractedImages.length > 0
      ? `- ${extractedImages.length} schémas/illustrations ont été extraits du document PDF (index de 0 à ${extractedImages.length - 1}). Si une question concerne directement la lecture, le repérage ou l'analyse d'un schéma du cours, inclut le champ \`imageIndex: N\` (ex: \`imageIndex: 0\`).
- Pour découper précisément le schéma dans l'image, fournis le champ \`boundingBox: [ymin, xmin, ymax, xmax]\` (coordonnées normalisées de 0 à 1000 encadrant uniquement la figure/schéma sans les marges blanches).`
      : '';

    const textContextPrompt = courseText.trim()
      ? `Extrait de texte du cours :\n${courseText.slice(0, 15000)}\n`
      : 'Note : Ce document PDF peut contenir du texte scanné ou des schémas visuels. Utilise tes capacités de vision multimodale et OCR pour lire l\'intégralité du document joint.';

    const prompt = `
Tu es un professeur et créateur de contenu pédagogique expert.
Analyse le document de cours ci-joint et génère un jeu complet de cartes de révision. Chaque carte servira à la fois de Flash Card (Question / Réponse courte) ET de question de Quiz (QCM 4 options).

Titre du cours : ${courseTitle}

${textContextPrompt}

Règles OBLIGATOIRES :
- Génère entre 6 et 10 questions pertinentes couvrant l'ensemble des notions et schémas importants de ce cours.
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
      "imageIndex": 0,
      "boundingBox": [100, 50, 600, 950]
    }
  ]
}
`;

    // Appel à l'API Gemini : si pdfPart est présent, on envoie à la fois le PDF et le prompt (multimodal)
    const contentsArray = pdfPart ? [pdfPart, prompt] : [prompt];
    console.log('[COURSE_CARDS_API] Envoi de la requête à Gemini (Multimodal:', !!pdfPart, ')');

    const result = await model.generateContent(contentsArray);
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

    // Formatage des questions avec réattribution et découpage (Crop) des schémas par Bounding Box
    const formattedQuestions = await Promise.all(
      data.questions.map(async (q: any, i: number) => {
        let imageUrl: string | undefined = undefined;

        if (typeof q.imageIndex === 'number' && extractedImages[q.imageIndex]) {
          const rawUri = extractedImages[q.imageIndex];
          if (Array.isArray(q.boundingBox) && q.boundingBox.length === 4) {
            imageUrl = await cropImageWithBoundingBox(rawUri, q.boundingBox as [number, number, number, number]);
          } else {
            imageUrl = rawUri;
          }
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
      })
    );

    console.log('[COURSE_CARDS_API] Succès !', formattedQuestions.length, 'questions générées.');

    return NextResponse.json({
      title: data.title || courseTitle,
      questions: formattedQuestions,
    });

  } catch (err: any) {
    console.error('[COURSE_CARDS_API] Erreur serveur:', err?.message);
    return NextResponse.json(
      { error: 'Erreur lors du traitement du document PDF' },
      { status: 500 }
    );
  }
}
