import { NextResponse } from "next/server";
import { answerQuestion, type ChatMessage } from "@/lib/rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      history?: ChatMessage[];
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message manquant." }, { status: 400 });
    }

    const result = await answerQuestion({
      question: message,
      history: Array.isArray(body.history) ? body.history : []
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de generer une reponse pour le moment." },
      { status: 500 }
    );
  }
}
