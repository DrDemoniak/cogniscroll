import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Jimp } from 'jimp';
import { getDocumentProxy, extractImages } from 'unpdf';
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

/** Reconstruit un Plain Object JavaScript pur et strict sans aucune propriété undefined ou prototype complexe */
function sanitizeQuestionForFirestore(q: any, i: number = 0): Record<string, any> {
  const cleanQ: Record<string, any> = {
    id: String(q.id || `q_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`),
    question: String(q.question || ''),
    answer: String(q.answer || ''),
    options: Array.isArray(q.options)
      ? q.options.map((opt: any) => String(opt || ''))
      : ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
    explanation: String(q.explanation || ''),
  };

  if (q.imageUrl && typeof q.imageUrl === 'string' && q.imageUrl.trim() !== '') {
    cleanQ.imageUrl = String(q.imageUrl);
  }

  return cleanQ;
}


/** Convertit un objet image issu d'unpdf ou du scanner en une VRAIE Data URI JPEG compressée valide et lisible par la balise <img> */
async function processExtractedPdfImage(img: any): Promise<string | null> {
  try {
    if (!img) return null;

    let rawBuffer: Buffer | null = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let needsRgbaConversion = false;

    // 1. Extraction du Buffer selon le type de donnée entrant
    if (typeof img === 'string' && img.startsWith('data:image/')) {
      const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
      rawBuffer = Buffer.from(base64Data, 'base64');
    } else if (img && img.data && (img.width || img.data.byteLength)) {
      // Filtrage strict HD Anti-Ampoule/Anti-Logo : élimination de toute image < 350x250 px ou < 25 KB
      if (img.width && img.height && (img.width < 350 || img.height < 250)) {
        console.log(`[HD_FILTER] Image parasite trop petite ignorée (${img.width}x${img.height} px) — élimination des ampoules/logos.`);
        return null;
      }
      if (img.data.byteLength && img.data.byteLength < 25000) {
        console.log(`[HD_FILTER] Poids d'image trop faible ignoré (${img.data.byteLength} octets) — élimination des ampoules/icônes.`);
        return null;
      }

      rawBuffer = Buffer.from(img.data);
      originalWidth = img.width;
      originalHeight = img.height;

      // Détection rapide de l'en-tête (JPEG = FFD8FF, PNG = 89504E)
      const isJpeg = rawBuffer.length > 3 && rawBuffer[0] === 0xff && rawBuffer[1] === 0xd8 && rawBuffer[2] === 0xff;
      const isPng = rawBuffer.length > 3 && rawBuffer[0] === 0x89 && rawBuffer[1] === 0x50 && rawBuffer[2] === 0x4e;

      if (!isJpeg && !isPng && img.width && img.height) {
        needsRgbaConversion = true;
      }
    }

    if (!rawBuffer || rawBuffer.length === 0) return null;

    // 2. Traitement et Compression via Jimp pour respecter la limite Firestore (1MB)
    try {
      let jimpImage: any;

      if (needsRgbaConversion) {
        let finalBuffer = rawBuffer;
        if (rawBuffer.length === originalWidth * originalHeight * 3) {
          console.log(`[RGB_TO_RGBA] Détection format RGB 24-bit (${originalWidth}x${originalHeight}). Conversion vers RGBA 32-bit.`);
          finalBuffer = Buffer.alloc(originalWidth * originalHeight * 4);
          for (let i = 0, j = 0; i < rawBuffer.length; i += 3, j += 4) {
            finalBuffer[j] = rawBuffer[i];
            finalBuffer[j + 1] = rawBuffer[i + 1];
            finalBuffer[j + 2] = rawBuffer[i + 2];
            finalBuffer[j + 3] = 255;
          }
        }
        jimpImage = new Jimp({ width: originalWidth, height: originalHeight, data: finalBuffer });
      } else {
        jimpImage = await Jimp.read(rawBuffer);
      }

      // Redimensionnement dynamique si l'image est trop large
      if (jimpImage.bitmap.width > 1200) {
        jimpImage.resize(1200, -1);
        console.log(`[IMAGE_COMPRESSION] Image redimensionnée à 1200px de large pour optimiser le poids.`);
      }

      // Compression en JPEG avec qualité à 80% (Gain énorme sur le poids base64)
      jimpImage.quality(80);
      
      let jpegBuffer: Buffer;
      if (typeof jimpImage.getBufferAsync === 'function') {
        jpegBuffer = await jimpImage.getBufferAsync('image/jpeg');
      } else {
        jpegBuffer = await jimpImage.getBuffer('image/jpeg');
      }

      console.log(`[IMAGE_COMPRESSION] Image finalisée et compressée en JPEG (${jpegBuffer.length} octets).`);
      return `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;

    } catch (jimpErr) {
      console.warn('[IMAGE_COMPRESSION] Échec du traitement Jimp (fallback). Erreur:', jimpErr);
      // Fallback de secours: si Jimp plante et que l'image fait moins de 700KB, on la renvoie brute
      if (!needsRgbaConversion && rawBuffer.length < 700000) {
        const mime = rawBuffer[0] === 0xff ? 'image/jpeg' : 'image/png';
        return `data:${mime};base64,${rawBuffer.toString('base64')}`;
      }
    }

  } catch (err) {
    console.error('[IMAGE_CONVERTER] Erreur critique lors du traitement de l\'image:', err);
  }
  return null;
}

/** Extrait les schémas/images HD de chaque page du PDF et les mappe par numéro de page (1 à N) */
async function extractImagesByPageFromPdf(buffer: Buffer): Promise<Map<number, string[]>> {
  const pageMap = new Map<number, string[]>();
  try {
    const pdfData = new Uint8Array(buffer);
    const pdf = await getDocumentProxy(pdfData);
    const totalPages = Math.min(15, pdf.numPages);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const pageImages: string[] = [];
      try {
        const extracted = await extractImages(pdf, pageNum);
        for (const img of extracted) {
          if (img && img.data && img.data.byteLength > 20000) {
            const validDataUri = await processExtractedPdfImage(img);
            if (validDataUri) {
              pageImages.push(validDataUri);
              console.log(`[PAGE_MAP] Page ${pageNum} : Image HD conservée (${img.width}x${img.height} px) !`);
            }
          }
        }
      } catch (e) {}
      if (pageImages.length > 0) {
        pageMap.set(pageNum, pageImages);
      }
    }
  } catch (err) {
    console.error('[PAGE_MAP] Erreur construction carte de pages:', err);
  }
  return pageMap;
}

/** Extrait les vrais schémas/images (JPEG/PNG) intégrés au PDF sous forme de Data URIs via unpdf & scanner */
async function extractImagesFromPdfBuffer(buffer: Buffer): Promise<string[]> {
  const images: string[] = [];

  // 1. Détection via unpdf (100% JS pure) avec filtre HD (> 25 KB)
  try {
    const pdfData = new Uint8Array(buffer);
    const pdf = await getDocumentProxy(pdfData);
    const totalPages = Math.min(10, pdf.numPages);

    for (let pageNum = 1; pageNum <= totalPages && images.length < 8; pageNum++) {
      try {
        const pageImages = await extractImages(pdf, pageNum);
        for (const img of pageImages) {
          if (img && img.data && img.data.byteLength > 25000) {
            const validDataUri = await processExtractedPdfImage(img);
            if (validDataUri) {
              images.push(validDataUri);
              console.log(`[UNPDF] Image/Schéma HD réel conservé pour la page ${pageNum} !`);
            }
          }
        }
      } catch (pageErr) {
        // ignorer les pages sans images
      }
    }
  } catch (err) {
    console.error('[UNPDF] Erreur extraction unpdf:', err);
  }

  // 2. Si unpdf n'a pas trouvé d'images, fallback sur le scanner binaire direct
  if (images.length === 0) {
    try {
      let offset = 0;
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

            if (imgBuffer.length > 25000 && isValidJpegHeader) {
              const base64 = imgBuffer.toString('base64');
              images.push(`data:image/jpeg;base64,${base64}`);
            }
            offset = end;
            continue;
          }
        }
        offset++;
      }
    } catch (err) {
      console.error('[PDF_IMAGES] Erreur scanner binaire:', err);
    }
  }

  console.log(`[PDF_IMAGES] Total schémas valides extraits du PDF: ${images.length}`);
  return images;
}

export async function POST(request: NextRequest) {
  console.log('[COURSE_CARDS_API] Demande de génération de cartes de cours (Multimodal PDF & Bounding Box Crop)');

  const statusLogs: string[] = [];

  try {
    let courseText = '';
    let courseTitle = 'Mon Cours';
    let extractedImages: string[] = [];
    let imagesByPage = new Map<number, string[]>();
    let pdfPart: any = null;
    let pageCount = 0;

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
      statusLogs.push(`Fichier PDF "${file.name}" reçu (${buffer.length} octets).`);

      // 1. Envoi multimodal direct du PDF à Gemini en InlineData
      pdfPart = {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      };
      statusLogs.push(`Préparation de l'analyse multimodale Gemini (Vision OCR activée).`);

      // 2. Extraction des schémas par numéro de page (1 à N)
      imagesByPage = await extractImagesByPageFromPdf(buffer);
      extractedImages = await extractImagesFromPdfBuffer(buffer);
      statusLogs.push(`${extractedImages.length} image(s)/schéma(s) extrait(s) sur ${imagesByPage.size} page(s).`);

      // 3. Extraction optionnelle de texte brut via pdf-parse
      try {
        const parsed = await pdfParse(buffer);
        courseText = parsed.text || '';
        pageCount = parsed.numpages || 0;
        statusLogs.push(`Texte brut lu via pdf-parse: ${courseText.length} caractères, ${pageCount} pages.`);
      } catch (e) {
        statusLogs.push(`pdf-parse n'a pas pu extraire de texte brut (PDF scanné ou vectoriel pur). Passage en mode OCR Gemini Vision.`);
      }
    } else {
      const body = await request.json();
      courseText = body.text || '';
      courseTitle = body.title || 'Mon Cours';
      statusLogs.push(`Format Texte reçu (${courseText.length} caractères).`);
    }

    const hasImagesPrompt = extractedImages.length > 0
      ? `- ${extractedImages.length} schémas/illustrations ont été extraits du document PDF (index de 0 à ${extractedImages.length - 1}). Les images te sont fournies directement dans le prompt.
- RÈGLES DE SÉLECTION D'IMAGE STRICTES :
  1. Sélectionne PRIORITAIREMENT les vraies figures explicatives, diagrammes majeurs ou schémas du cours.
  2. REJETTE STRICTEMENT les icônes d'ampoules 💡, puces graphiques "Pour information / Remarque", logos d'université, en-têtes ou petites illustrations décoratives ! 
  3. Pour chaque question s'appuyant sur un schéma, indique :
     - "imageIndex": N (l'index exact de 0 à ${extractedImages.length - 1} de l'image correspondante que tu vois en pièce jointe).`
      : `- AUCUNE image matricielle autonome n'a été extraite (le cours utilise des schémas dessinés en formes/textes vectoriels PowerPoint/Word). Pour au moins 2 questions portant sur les mécanismes ou diagrammes clés du cours, génère le champ \`svgSchema: "<svg viewBox='0 0 500 300' xmlns='http://www.w3.org/2000/svg'>...</svg>"\` représentant un schéma vectoriel SVG schématique, propre, coloré, clair et explicatif résumant la notion.`;

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
      "svgSchema": "<svg viewBox='0 0 500 300' xmlns='http://www.w3.org/2000/svg'>...</svg>"
    }
  ]
}
`;

    // Appel à l'API Gemini : si pdfPart est présent, on envoie à la fois le PDF et le prompt (multimodal)
    const contentsArray: any[] = [];
    if (pdfPart) contentsArray.push(pdfPart);
    
    // Ajout des images extraites pour que Gemini puisse les voir directement
    extractedImages.forEach((dataUri, idx) => {
      const parts = dataUri.split(',');
      if (parts.length === 2) {
        const mime = parts[0].split(':')[1].split(';')[0];
        const base64 = parts[1];
        contentsArray.push(`[Image Index ${idx}]`);
        contentsArray.push({
          inlineData: {
            data: base64,
            mimeType: mime,
          },
        });
      }
    });
    contentsArray.push(prompt);
    statusLogs.push(`Envoi de la requête à l'API Gemini Vision avec ${extractedImages.length} image(s) extraite(s) jointes.`);

    const result = await model.generateContent(contentsArray);
    const responseText = result.response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[COURSE_CARDS_API] Erreur parsing JSON:', responseText.slice(0, 200));
      return NextResponse.json(
        { error: 'Réponse JSON invalide de l\'IA', debugInfo: { statusLog: statusLogs } },
        { status: 500 }
      );
    }

    if (!data.questions || !Array.isArray(data.questions)) {
      return NextResponse.json(
        { error: 'Structure de questions invalide', debugInfo: { statusLog: statusLogs } },
        { status: 500 }
      );
    }

    let croppedCount = 0;
    let svgCount = 0;

    // Formatage des questions avec réattribution infaillible par pageNumber & Bounding Box
    const formattedQuestions = await Promise.all(
      data.questions.map(async (q: any, i: number) => {
        let imageUrl: string | undefined = undefined;

        // 1. Association directe par imageIndex (Gemini a vu les images et a choisi l'index)
        if (typeof q.imageIndex === 'number' && extractedImages[q.imageIndex]) {
          imageUrl = extractedImages[q.imageIndex];
          console.log(`[IMAGE_MATCH] Question ${i + 1} : Image ${q.imageIndex} associée directement sans rognage !`);
        } else if (!imageUrl && q.svgSchema && typeof q.svgSchema === 'string' && q.svgSchema.includes('<svg')) {
          const cleanSvg = q.svgSchema.trim().replace(/^```xml/, '').replace(/^```html/, '').replace(/^```svg/, '').replace(/```$/, '');
          imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
          svgCount++;
        }

        const baseQuestion = {
          id: q.id || `q_${Date.now()}_${i}`,
          question: q.question,
          answer: q.answer || q.options?.[q.correctIndex || 0] || '',
          options: q.options || [q.answer, 'Option B', 'Option C', 'Option D'],
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
          explanation: q.explanation || '',
          imageUrl: imageUrl,
        };

        return sanitizeQuestionForFirestore(baseQuestion, i);
      })
    );

    const schemasAssignedCount = formattedQuestions.filter(q => !!q.imageUrl).length;
    statusLogs.push(`Analyse terminée : ${formattedQuestions.length} questions créées, ${schemasAssignedCount} schéma(s) assigné(s) (${croppedCount} rognage(s) Bounding Box, ${svgCount} schéma(s) vectoriel(s) SVG générés).`);

    // Purge de toutes les propriétés undefined pour compatibilité totale Firestore
    const cleanedQuestions = JSON.parse(JSON.stringify(formattedQuestions));

    const debugInfo = {
      pdfPagesCount: pageCount,
      extractedImagesCount: extractedImages.length,
      geminiSchemasDetected: schemasAssignedCount,
      croppedSchemasCount: croppedCount,
      svgSchemasCount: svgCount,
      statusLog: statusLogs,
    };

    console.log('[COURSE_CARDS_API] Succès ! Diagnostic:', debugInfo);

    return NextResponse.json({
      title: data.title || courseTitle,
      questions: cleanedQuestions,
      debugInfo: debugInfo,
    });

  } catch (err: any) {
    console.error('[COURSE_CARDS_API] Erreur serveur:', err?.message);
    return NextResponse.json(
      {
        error: 'Erreur lors du traitement du document PDF',
        details: err?.message || 'Erreur inconnue',
        debugInfo: { statusLog: statusLogs },
      },
      { status: 500 }
    );
  }
}
