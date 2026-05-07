"use client";

import { FormEvent, useMemo, useState } from "react";

type Source = {
  id: string;
  title: string;
  source: string;
  excerpt: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  mode?: "demo" | "openai";
};

const maxQuestionsPerSession = 8;
const maxQuestionLength = 500;

export function ChatExperience({ suggestedQuestions }: { suggestedQuestions: string[] }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Bonjour, je suis l'avatar de Benjamin. Je peux vous parler de mon parcours, de mes projets, de mes competences et de ma transition vers la Data Science."
    }
  ]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const history = useMemo(
    () => messages.map(({ role, content }) => ({ role, content })).slice(-8),
    [messages]
  );
  const askedQuestions = messages.filter((message) => message.role === "user").length;
  const hasReachedQuestionLimit = askedQuestions >= maxQuestionsPerSession;

  async function ask(question: string) {
    const message = question.trim().slice(0, maxQuestionLength);
    if (!message || isLoading) {
      return;
    }

    if (hasReachedQuestionLimit) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "J'ai limite cette demo a 8 questions par session pour maitriser les couts API. Pour continuer l'echange, contactez-moi sur LinkedIn ou relancez une nouvelle session."
        }
      ]);
      return;
    }

    setDraft("");
    setIsLoading(true);
    setMessages((current) => [...current, { role: "user", content: message }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Erreur inconnue");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.answer,
          sources: payload.sources,
          mode: payload.mode
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `Je n'arrive pas a repondre pour le moment: ${error.message}`
              : "Je n'arrive pas a repondre pour le moment."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <section className="chatPanel" aria-label="Conversation avec l'avatar">
      <header className="chatHeader">
        <div>
          <p className="eyebrow">Entretien rapide</p>
          <h2>Posez une question</h2>
        </div>
        <span className="status">RAG + OpenAI · {maxQuestionsPerSession - askedQuestions} restantes</span>
      </header>

      <div className="suggestions">
        {suggestedQuestions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => void ask(question)}
            disabled={isLoading || hasReachedQuestionLimit}
          >
            {question}
          </button>
        ))}
      </div>

      <div className="messages" aria-live="polite">
        {messages.map((message, index) => (
          <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
            {message.role === "assistant" && message.mode ? (
              <span className="answerMode">
                {message.mode === "openai" ? "Reponse generee avec RAG" : "Mode demo"}
              </span>
            ) : null}
            <p>{message.content}</p>
            {message.sources?.length ? (
              <details className="sources">
                <summary>Sources consultées</summary>
                <ul className="sourceList">
                  {message.sources.map((source) => (
                    <li className="sourceItem" key={source.id}>
                      <strong>{source.title}</strong>
                      <span className="sourcePath">{source.source}</span>
                      <span className="sourceExcerpt">{source.excerpt}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </article>
        ))}
        {isLoading ? <div className="typing">Recherche dans le portfolio...</div> : null}
      </div>

      <form className="composer" onSubmit={submit}>
        <input
          aria-label="Question pour l'avatar"
          value={draft}
          maxLength={maxQuestionLength}
          onChange={(event) => setDraft(event.target.value.slice(0, maxQuestionLength))}
          placeholder="Demandez mon parcours, mes projets, ma stack..."
        />
        <button type="submit" disabled={isLoading || hasReachedQuestionLimit}>
          Envoyer
        </button>
      </form>
    </section>
  );
}
