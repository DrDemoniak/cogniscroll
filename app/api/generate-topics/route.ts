import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: 'gemini-3.1-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    temperature: 0.9,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { themeName, doneTopics } = await request.json();

    if (!themeName) {
      return NextResponse.json({ error: 'themeName manquant' }, { status: 400 });
    }

    const prompt = `
Génère une liste de 10 NOUVEAUX sujets intéressants, spécifiques et originaux pour des fiches de culture générale sur le thème : "${themeName}".
Les sujets doivent être en français.

IMPORTANT: NE PROPOSE PAS ces sujets qui ont déjà été traités :
${(doneTopics || []).map((t: string) => '- ' + t).join('\n')}

Retourne UNIQUEMENT un JSON valide avec cette structure (sans markdown) :
{
  "topics": [
    "Sujet précis 1",
    "Sujet précis 2",
    ...
  ]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText);

    return NextResponse.json({ topics: data.topics });
  } catch (err) {
    console.error('[API] Erreur generate-topics:', err);
    return NextResponse.json({ error: 'Erreur génération' }, { status: 500 });
  }
}
