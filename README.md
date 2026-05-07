# Portfolio RAG Avatar

Application portfolio ou un recruteur peut discuter avec un avatar de Benjamin. Les reponses sont generees par LLM a partir d'un corpus personnel versionne dans `content/`.

## Objectif

Montrer une demo concrete de web, LLM et RAG:

- interface conversationnelle orientee recruteur;
- corpus personnel en Markdown;
- retrieval sur chunks indexes;
- reponses sourcees;
- deploiement simple sur Vercel.

## Stack

- Next.js
- TypeScript
- OpenAI Responses API
- OpenAI embeddings
- Index JSON local pour la V1

## Demarrage

```bash
npm install
cp .env.example .env.local
npm run index
npm run dev
```

Ouvre `http://localhost:3000`.

Sans `OPENAI_API_KEY`, l'application fonctionne en mode demo avec une recherche lexicale locale. Avec une cle OpenAI, `npm run index` ajoute les embeddings et le chat utilise le LLM.

## Corpus

Modifie les fichiers dans `content/`, puis relance:

```bash
npm run index
```

Structure conseillee pour la suite:

- `cv.md`
- `bio.md`
- `projects.md`
- `skills.md`
- `goals.md`
- `faq.md`

## Architecture

```text
app/page.tsx
  -> interface recruteur

components/chat-experience.tsx
  -> chat client, questions suggerees, affichage des sources

app/api/chat/route.ts
  -> endpoint backend qui recoit la question

lib/rag.ts
  -> retrieval, prompt, appel OpenAI, fallback demo

scripts/build-index.mjs
  -> chunking Markdown + embeddings optionnels

data/rag-index.json
  -> index embarque au deploiement
```

## Deploiement

Sur Vercel:

1. pousser le repo sur GitHub;
2. importer le projet dans Vercel;
3. ajouter `OPENAI_API_KEY`;
4. garder la commande de build `npm run build`;
5. deployer.
