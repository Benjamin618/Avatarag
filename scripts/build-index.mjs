import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

const root = process.cwd();
const contentDir = path.join(root, "content");
const outputPath = path.join(root, "data", "rag-index.json");
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

await loadEnvFile(".env");
await loadEnvFile(".env.local");

const files = (await fs.readdir(contentDir)).filter((file) => file.endsWith(".md")).sort();
const chunks = [];

for (const file of files) {
  const markdown = await fs.readFile(path.join(contentDir, file), "utf8");
  const sections = splitMarkdown(markdown);

  sections.forEach((section, index) => {
    chunks.push({
      id: `${file.replace(/\.md$/, "")}-${index + 1}`,
      source: `content/${file}`,
      title: section.title,
      text: section.text
    });
  });
}

if (process.env.OPENAI_API_KEY && chunks.length > 0) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.embeddings.create({
    model: embeddingModel,
    input: chunks.map((chunk) => chunk.text),
    encoding_format: "float"
  });

  response.data.forEach((item, index) => {
    chunks[index].embedding = item.embedding;
  });
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      embeddingModel: process.env.OPENAI_API_KEY ? embeddingModel : null,
      chunks
    },
    null,
    2
  )
);

console.log(`Indexed ${chunks.length} chunks into ${path.relative(root, outputPath)}.`);

function splitMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let currentTitle = "Note";
  let buffer = [];

  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading && buffer.join("\n").trim()) {
      sections.push({ title: currentTitle, text: buffer.join("\n").trim() });
      currentTitle = heading[1].trim();
      buffer = [];
    } else if (heading) {
      currentTitle = heading[1].trim();
    } else {
      buffer.push(line);
    }
  }

  if (buffer.join("\n").trim()) {
    sections.push({ title: currentTitle, text: buffer.join("\n").trim() });
  }

  return sections.flatMap(chunkSection);
}

function chunkSection(section) {
  const maxLength = 900;
  if (section.text.length <= maxLength) {
    return [section];
  }

  const chunks = [];
  const paragraphs = section.text.split(/\n\s*\n/);
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = `${current}\n\n${paragraph}`.trim();
    if (candidate.length > maxLength && current.trim()) {
      chunks.push({ title: section.title, text: current.trim() });
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push({ title: section.title, text: current.trim() });
  }

  return chunks;
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
