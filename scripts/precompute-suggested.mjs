import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const root = process.cwd();
const indexPath = path.join(root, "data", "rag-index.json");
const questionsPath = path.join(root, "data", "suggested-questions.json");
const outputDir = path.join(root, "public", "precomputed");
const outputJsonPath = path.join(outputDir, "suggested.json");

const chatModel = process.env.OPENAI_MODEL ?? "gpt-5.2";
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const ttsModel = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
const ttsVoice = process.env.OPENAI_TTS_VOICE ?? "verse";
const maxRagChunks = 3;

await loadEnvFile(".env");
await loadEnvFile(".env.local");

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required to precompute suggested answers.");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const questions = JSON.parse(await fs.readFile(questionsPath, "utf8"));
const ragIndex = JSON.parse(await fs.readFile(indexPath, "utf8"));
const existingAnswers = await loadExistingAnswers();

await fs.mkdir(outputDir, { recursive: true });

const answers = [];

for (let index = 0; index < questions.length; index += 1) {
  const question = questions[index];
  const slug = `suggested-${index + 1}`;
  const audioFile = `${slug}.mp3`;
  const audioPath = path.join(outputDir, audioFile);
  const previous = existingAnswers.get(question);
  const matches = previous ? [] : (await retrieve(question, ragIndex.chunks)).slice(0, maxRagChunks);
  const answer = previous?.answer ?? (await answerQuestion(question, matches));
  const sources = previous?.sources ?? buildSources(matches);
  const speechText = toSpeechText(answer);

  if (!(await isUsableAudio(audioPath))) {
    const speech = await openai.audio.speech.create({
      model: ttsModel,
      voice: ttsVoice,
      input: speechText,
      instructions:
        "Francais metropolitain naturel, voix masculine ou neutre adulte, ton professionnel mais souriant et accessible. " +
        "Debit legerement soutenu, energie positive, comme une conversation d'entretien agreable. " +
        "Evite une voix trop aigue, feminine, trop grave, trop lente, trop solennelle, trop theatrale ou trop institutionnelle."
    });

    await fs.writeFile(audioPath, Buffer.from(await speech.arrayBuffer()));
  }

  answers.push({
    question,
    answer,
    audioUrl: `/precomputed/${audioFile}`,
    sources
  });

  console.log(`Precomputed ${index + 1}/${questions.length}: ${question}`);
}

await fs.writeFile(
  outputJsonPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      models: {
        chat: chatModel,
        embedding: embeddingModel,
        speech: ttsModel,
        voice: ttsVoice
      },
      answers
    },
    null,
    2
  )
);

console.log(`Wrote ${path.relative(root, outputJsonPath)}.`);

async function answerQuestion(question, matches) {
  const context = matches
    .map(({ chunk }, sourceIndex) => `[Source ${sourceIndex + 1}: ${chunk.title} | ${chunk.source}]\n${chunk.text}`)
    .join("\n\n");

  const response = await openai.responses.create({
    model: chatModel,
    instructions:
      "Tu es l'avatar portfolio de Benjamin Daumas et tu parles a la premiere personne, comme Benjamin. " +
      "Reponds en francais, avec un ton professionnel, naturel, direct et humain. " +
      "Utilise uniquement le contexte RAG fourni. Si une information manque, dis-le clairement sans inventer. " +
      "Formule une reponse tres synthetique et agreable a ecouter a voix haute: 1 paragraphe ou 2 courts paragraphes maximum, environ 15 a 30 secondes de lecture. " +
      "Ne mets pas de mention de sources dans le texte de la reponse: les sources sont affichees separement dans l'interface.",
    input:
      `Contexte RAG:\n${context || "Aucun contexte pertinent trouve."}\n\n` +
      `Question du recruteur: ${question}`,
    reasoning: { effort: "low" },
    max_output_tokens: 420
  });

  return response.output_text || "Je n'ai pas reussi a formuler une reponse.";
}

async function loadExistingAnswers() {
  try {
    const raw = await fs.readFile(outputJsonPath, "utf8");
    const payload = JSON.parse(raw);
    if (!Array.isArray(payload.answers)) {
      return new Map();
    }

    return new Map(payload.answers.map((answer) => [answer.question, answer]));
  } catch {
    return new Map();
  }
}

async function isUsableAudio(audioPath) {
  try {
    const stat = await fs.stat(audioPath);
    return stat.size > 50_000;
  } catch {
    return false;
  }
}

async function retrieve(question, chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const hasEmbeddings = chunks.every((chunk) => Array.isArray(chunk.embedding));
  if (hasEmbeddings) {
    const embedding = await openai.embeddings.create({
      model: embeddingModel,
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

function buildSources(matches) {
  return matches.map(({ chunk }) => ({
    id: chunk.id,
    title: chunk.title,
    source: chunk.source,
    excerpt: chunk.text.slice(0, 280)
  }));
}

function rankByEmbedding(queryVector, chunks) {
  return chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryVector, chunk.embedding ?? [])
    }))
    .sort((a, b) => b.score - a.score);
}

function cosineSimilarity(a, b) {
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

function lexicalScore(query, title, document) {
  const terms = tokenize(query);
  const titleTerms = new Set(tokenize(title));
  const documentTerms = new Set(tokenize(`${title}\n${document}`));

  return terms.reduce((score, term) => {
    if (titleTerms.has(term)) {
      return score + 4;
    }
    return score + (documentTerms.has(term) ? 1 : 0);
  }, 0);
}

function tokenize(text) {
  return normalizeForSearch(text)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
}

function normalizeForSearch(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toSpeechText(content) {
  return content
    .replace(/\((?:sources?|voir source|source)\s*:[^)]+\)/gi, "")
    .replace(/\((?:sources?|source)\s+\d+(?:\s*,\s*(?:sources?|source)?\s*\d+)*\)/gi, "")
    .replace(/(?:sources?|source)\s*:\s*[^.\n]+[.\n]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function loadEnvFile(filename) {
  try {
    const raw = await fs.readFile(path.join(root, filename), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Optional local config.
  }
}
