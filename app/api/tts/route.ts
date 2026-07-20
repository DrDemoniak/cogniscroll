/**
 * app/api/tts/route.ts
 * Route API sécurisée pour la synthèse vocale via Google Cloud Text-to-Speech.
 * Utilise la voix française Neural2 pour une qualité naturelle.
 * La clé API reste côté serveur (GOOGLE_TTS_API_KEY).
 */

import { NextRequest, NextResponse } from 'next/server';

// Limite de caractères par requête (Google TTS : max 5000 bytes en input)
const MAX_TEXT_LENGTH = 4500;

export async function POST(request: NextRequest) {
  console.log('[TTS] Requête de synthèse vocale reçue');

  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Paramètre text manquant' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      console.error('[TTS] Clé GOOGLE_TTS_API_KEY manquante');
      return NextResponse.json({ error: 'TTS non configuré' }, { status: 500 });
    }

    // Tronque si trop long (limite API Google)
    const truncatedText = text.length > MAX_TEXT_LENGTH
      ? text.slice(0, MAX_TEXT_LENGTH) + '...'
      : text;

    console.log(`[TTS] Synthèse de ${truncatedText.length} caractères`);

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: truncatedText },
          voice: {
            languageCode: 'fr-FR',
            // Neural2-C = voix féminine française naturelle et agréable
            name: 'fr-FR-Neural2-C',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.95,   // légèrement plus lent pour la compréhension
            pitch: 0,             // neutre
            volumeGainDb: 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] Erreur API Google:', response.status, errorText.slice(0, 200));
      return NextResponse.json(
        { error: `Erreur TTS Google: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.audioContent) {
      console.error('[TTS] Pas de contenu audio dans la réponse');
      return NextResponse.json({ error: 'Réponse TTS invalide' }, { status: 500 });
    }

    console.log('[TTS] Synthèse réussie, audio généré');
    return NextResponse.json({ audioContent: data.audioContent });

  } catch (err: any) {
    console.error('[TTS] Erreur inattendue:', err?.message);
    return NextResponse.json({ error: 'Erreur lors de la synthèse vocale' }, { status: 500 });
  }
}
