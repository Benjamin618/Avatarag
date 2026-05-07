import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RagChunk = {
  id: string;
  source: string;
  title: string;
  text: string;
  embedding?: number[];
};

type RagIndex = {
  generatedAt: string;
  embeddingModel: string | null;
  chunks: RagChunk[];
};

type AnswerQuestionInput = {
  question: string;
  history: ChatMessage[];
};

const indexPath = path.join(process.cwd(), "data", "rag-index.json");
const defaultModel = process.env.OPENAI_MODEL ?? "gpt-5.2";
const defaultEmbeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const maxQuestionLength = 500;
const maxRagChunks = 3;
const maxOutputTokens = 900;

export async function answerQuestion({ question, history }: AnswerQuestionInput) {
  const normalizedQuestion = question.trim().slice(0, maxQuestionLength);
  const ragIndex = await loadIndex();
  const matches = (await retrieve(normalizedQuestion, ragIndex.chunks)).slice(0, maxRagChunks);

  if (!process.env.OPENAI_API_KEY) {
    const demoMatches = matches.slice(0, 1);
    return {
      mode: "demo",
      answer: buildDemoAnswer(normalizedQuestion, demoMatches.map((match) => match.chunk)),
      sources: buildSources(demoMatches)
    };
  }

  const sources = buildSources(matches);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const context = matches
    .map(({ chunk }, index) => `[Source ${index + 1}: ${chunk.title} | ${chunk.source}]\n${chunk.text}`)
    .join("\n\n");

  const conversation = history
    .slice(-6)
    .map((message) => `${message.role === "user" ? "Recruteur" : "Avatar"}: ${message.content}`)
    .join("\n");

  const response = await openai.responses.create({
    model: defaultModel,
    instructions:
      "Tu es l'avatar portfolio de Benjamin Daumas et tu parles a la premiere personne, comme Benjamin. " +
      "Reponds en francais, avec un ton professionnel, naturel, direct et humain. " +
      "Utilise uniquement le contexte RAG fourni. Si une information manque, dis-le clairement sans inventer et indique que cette information n'est pas encore dans ton corpus. " +
      "Garde les reponses courtes: 2 ou 3 paragraphes maximum, sans liste longue. " +
      "Ne cite qu'une ou deux sources quand cela aide.",
    input:
      `Historique recent:\n${conversation || "Aucun."}\n\n` +
      `Contexte RAG:\n${context || "Aucun contexte pertinent trouve."}\n\n` +
      `Question du recruteur: ${normalizedQuestion}`,
    reasoning: { effort: "low" },
    max_output_tokens: maxOutputTokens
  });

  return {
    mode: "openai",
    answer: response.output_text || "Je n'ai pas reussi a formuler une reponse.",
    sources
  };
}

async function loadIndex(): Promise<RagIndex> {
  try {
    const raw = await fs.readFile(indexPath, "utf8");
    return JSON.parse(raw) as RagIndex;
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      embeddingModel: null,
      chunks: []
    };
  }
}

async function retrieve(question: string, chunks: RagChunk[]) {
  if (chunks.length === 0) {
    return [];
  }

  const hasEmbeddings = chunks.every((chunk) => Array.isArray(chunk.embedding));
  if (hasEmbeddings && process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const embedding = await openai.embeddings.create({
      model: defaultEmbeddingModel,
      input: question,
      encoding_format: "float"
    });
    const vector = embedding.data[0]?.embedding ?? [];
    return rankByEmbedding(vector, chunks).slice(0, 5);
  }

  return chunks
    .map((chunk) => ({ chunk, score: lexicalScore(question, chunk.title, chunk.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function buildSources(matches: Array<{ chunk: RagChunk; score: number }>) {
  return matches.map(({ chunk }) => ({
    id: chunk.id,
    title: chunk.title,
    source: chunk.source,
    excerpt: chunk.text.slice(0, 280)
  }));
}

function rankByEmbedding(queryVector: number[], chunks: RagChunk[]) {
  return chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryVector, chunk.embedding ?? [])
    }))
    .sort((a, b) => b.score - a.score);
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function lexicalScore(query: string, title: string, document: string) {
  const terms = tokenize(query);
  const titleTerms = new Set(tokenize(title));
  const documentTerms = new Set(tokenize(`${title}\n${document}`));
  const normalizedQuery = normalizeForSearch(query);
  const normalizedTitle = normalizeForSearch(title);
  const exactTitleBonus =
    normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle) ? 100 : 0;

  return terms.reduce((score, term) => {
    if (titleTerms.has(term)) {
      return score + 4;
    }
    return score + (documentTerms.has(term) ? 1 : 0);
  }, exactTitleBonus);
}

function tokenize(text: string) {
  return normalizeForSearch(text)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
}

function normalizeForSearch(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildDemoAnswer(question: string, chunks: RagChunk[]) {
  if (chunks.length === 0) {
    return "Je n'ai pas encore de corpus a consulter. Ajoute les fichiers Markdown dans content/, puis relance npm run index.";
  }

  const [bestChunk] = chunks;

  return [
    "Mode demo sans cle OpenAI : je n'ai pas encore de generation LLM activee, mais j'ai retrouve la meilleure reponse dans le corpus.",
    "",
    bestChunk.text,
    "",
    `Source : ${bestChunk.title} (${bestChunk.source})`,
    "",
    `Question recue : ${question}`,
    "Ajoute OPENAI_API_KEY dans .env.local pour activer ma reponse conversationnelle complete."
  ].join("\n");
}
