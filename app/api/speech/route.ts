import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const defaultTtsModel = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
const defaultVoice = process.env.OPENAI_TTS_VOICE ?? "verse";
const maxSpeechLength = 1200;

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Cle OpenAI manquante." }, { status: 503 });
    }

    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim().slice(0, maxSpeechLength);

    if (!text) {
      return NextResponse.json({ error: "Texte manquant." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const speech = await openai.audio.speech.create({
      model: defaultTtsModel,
      voice: defaultVoice,
      input: text,
      instructions:
        "Francais metropolitain naturel, voix masculine ou neutre adulte, ton professionnel mais souriant et accessible. " +
        "Debit legerement soutenu, energie positive, comme une conversation d'entretien agreable. " +
        "Evite une voix trop aigue, feminine, trop grave, trop lente, trop solennelle, trop theatrale ou trop institutionnelle."
    });

    const audio = await speech.arrayBuffer();

    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de generer la voix pour le moment." },
      { status: 500 }
    );
  }
}
