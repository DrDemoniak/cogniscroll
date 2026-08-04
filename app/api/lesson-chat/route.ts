import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
// On utilise gemini-2.5-flash pour un chat rapide
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, chatHistory, lessonContent } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message manquant' }, { status: 400 });
    }
    if (!lessonContent) {
      return NextResponse.json({ error: 'Contenu de la leçon manquant' }, { status: 400 });
    }

    const prompt = `
Tu es un tuteur pédagogique interactif (un chatbot) nommé "CogniBot". Ton rôle est d'aider l'étudiant à comprendre la leçon en cours.
Voici le contenu de la leçon que l'étudiant est en train de lire :
--- LEÇON ---
Titre : ${lessonContent.title}
Thème : ${lessonContent.theme}
Sujet : ${lessonContent.topic}
Résumé : ${lessonContent.summary}
Sections : 
${lessonContent.sections.map((s: any) => `- ${s.title}: ${s.content}`).join('\n')}
-----------------

Historique de la conversation (pour contexte) :
${chatHistory.map((msg: any) => `${msg.role === 'user' ? 'Étudiant' : 'CogniBot'}: ${msg.content}`).join('\n')}

L'étudiant te pose maintenant cette question ou fait cette remarque :
" ${message} "

Instructions :
1. Réponds de manière encourageante, claire et pédagogique. Sois concis.
2. Si la question montre que l'étudiant explore une notion intéressante ou pose une question pertinente, TU DOIS créer une nouvelle question de quiz adaptée pour tester cette notion.
3. Retourne TA RÉPONSE AU FORMAT JSON EXACTEMENT COMMME SUIT (pas de markdown \`\`\`json) :

{
  "reply": "Ta réponse texte à l'étudiant (peut contenir des émojis et du markdown basique comme **gras**)",
  "newQuizQuestion": null // Laisse null si aucune question de quiz pertinente n'est ajoutée
}

Cependant, si tu crées une question de quiz, utilise cette structure pour newQuizQuestion :
{
  "reply": "Ta réponse...",
  "newQuizQuestion": {
    "question": "La question du quiz",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0, // l'index de la bonne réponse
    "explanation": "L'explication de la bonne réponse"
  }
}
`;

    const result = await model.generateContent(prompt);
    
    if (result.response.candidates && result.response.candidates[0].finishReason === 'SAFETY') {
      return NextResponse.json(
        { error: 'Le filtre de sécurité a bloqué la génération.' },
        { status: 403 }
      );
    }

    let text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanText = jsonMatch ? jsonMatch[0] : text;
    
    const data = JSON.parse(cleanText);

    return NextResponse.json({ 
      reply: data.reply, 
      newQuizQuestion: data.newQuizQuestion 
    });

  } catch (error) {
    console.error('[CHAT_API] Erreur:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération de la réponse' }, { status: 500 });
  }
}
