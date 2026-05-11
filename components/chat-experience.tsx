"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { AvatarState } from "@/components/avatar-stage";

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
  mode?: "demo" | "openai" | "precomputed";
};

type ChatExperienceProps = {
  suggestedQuestions: string[];
  onAvatarStateChange?: (state: AvatarState) => void;
};

type PrecomputedAnswer = {
  question: string;
  answer: string;
  audioUrl: string;
  sources: Source[];
};

type PrecomputedPayload = {
  answers: PrecomputedAnswer[];
};

const maxQuestionsPerSession = 8;
const maxQuestionLength = 500;

function toSpeechText(content: string) {
  return content
    .replace(/\((?:sources?|voir source|source)\s*:[^)]+\)/gi, "")
    .replace(/\((?:sources?|source)\s+\d+(?:\s*,\s*(?:sources?|source)?\s*\d+)*\)/gi, "")
    .replace(/(?:sources?|source)\s*:\s*[^.\n]+[.\n]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function ChatExperience({ suggestedQuestions, onAvatarStateChange }: ChatExperienceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Bonjour, je suis l'avatar de Benjamin. Choisissez une question: je repondrai a partir de son CV, de ses projets et de son corpus portfolio."
    }
  ]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [preparingAudioIndex, setPreparingAudioIndex] = useState<number | null>(null);
  const [audioCache, setAudioCache] = useState<{ index: number; url: string; revoke: boolean } | null>(
    null
  );
  const [precomputedAnswers, setPrecomputedAnswers] = useState<Record<string, PrecomputedAnswer>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingRef = useRef(false);

  const history = useMemo(
    () => messages.map(({ role, content }) => ({ role, content })).slice(-8),
    [messages]
  );
  const askedQuestions = messages.filter((message) => message.role === "user").length;
  const hasReachedQuestionLimit = askedQuestions >= maxQuestionsPerSession;
  const latestAssistantIndex = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === "assistant" && index > 0) {
        return index;
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPrecomputedAnswers() {
      try {
        const response = await fetch("/precomputed/suggested.json", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as PrecomputedPayload;
        if (isCancelled || !Array.isArray(payload.answers)) {
          return;
        }

        setPrecomputedAnswers(
          Object.fromEntries(payload.answers.map((answer) => [answer.question, answer]))
        );
      } catch {
        // Precomputed answers are optional; dynamic RAG remains the fallback.
      }
    }

    void loadPrecomputedAnswers();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (latestAssistantIndex === null) {
      return undefined;
    }

    const latestMessage = messages[latestAssistantIndex];
    if (latestMessage.mode !== "openai") {
      return undefined;
    }

    const preloadIndex = latestAssistantIndex;
    let isCancelled = false;
    setPreparingAudioIndex(preloadIndex);
    setAudioCache((current) => {
      if (current?.revoke) {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });

    async function preloadSpeech() {
      try {
        const response = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: toSpeechText(latestMessage.content) })
        });

        if (!response.ok) {
          throw new Error("Audio indisponible");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (isCancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        setAudioCache({ index: preloadIndex, url, revoke: true });
      } catch {
        if (!isCancelled) {
          setAudioCache(null);
        }
      } finally {
        if (!isCancelled) {
          setPreparingAudioIndex(null);
        }
      }
    }

    void preloadSpeech();

    return () => {
      isCancelled = true;
    };
  }, [latestAssistantIndex, messages]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioCache) {
        if (audioCache.revoke) {
          URL.revokeObjectURL(audioCache.url);
        }
      }
    };
  }, [audioCache]);

  function setAvatarState(state: AvatarState) {
    onAvatarStateChange?.(state);
  }

  function stopSpeech() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeakingIndex(null);
    setAvatarState("idle");
  }

  async function speak(content: string, index: number) {
    if (speakingIndex === index) {
      stopSpeech();
      return;
    }

    stopSpeech();
    setSpeakingIndex(index);
    setAvatarState("speaking");

    try {
      let url = audioCache?.index === index ? audioCache.url : null;
      let shouldRevokeUrl = false;
      if (!url) {
        setPreparingAudioIndex(index);
        const response = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: toSpeechText(content) })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error ?? "Audio indisponible");
        }

        const blob = await response.blob();
        url = URL.createObjectURL(blob);
        shouldRevokeUrl = true;
      }

      const audio = new Audio(url);
      audio.playbackRate = 1.08;
      audioRef.current = audio;
      audio.onended = () => {
        if (shouldRevokeUrl) {
          URL.revokeObjectURL(url);
        }
        setSpeakingIndex(null);
        setAvatarState("idle");
      };
      audio.onerror = () => {
        if (shouldRevokeUrl) {
          URL.revokeObjectURL(url);
        }
        setSpeakingIndex(null);
        setAvatarState("error");
      };
      await audio.play();
    } catch {
      setSpeakingIndex(null);
      setAvatarState("error");
    } finally {
      setPreparingAudioIndex(null);
    }
  }

  async function ask(question: string) {
    const message = question.trim().slice(0, maxQuestionLength);
    if (!message || isLoading || pendingRef.current) {
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

    const precomputedAnswer = precomputedAnswers[message];
    if (precomputedAnswer) {
      const assistantIndex = messages.length + 1;
      setDraft("");
      stopSpeech();
      setMessages((current) => [
        ...current,
        { role: "user", content: message },
        {
          role: "assistant",
          content: precomputedAnswer.answer,
          sources: precomputedAnswer.sources,
          mode: "precomputed"
        }
      ]);
      setAudioCache((current) => {
        if (current?.revoke) {
          URL.revokeObjectURL(current.url);
        }
        return { index: assistantIndex, url: precomputedAnswer.audioUrl, revoke: false };
      });
      return;
    }

    setDraft("");
    setIsLoading(true);
    pendingRef.current = true;
    stopSpeech();
    setAvatarState("thinking");
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
      setAvatarState("idle");
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
      setAvatarState("error");
    } finally {
      setIsLoading(false);
      pendingRef.current = false;
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
          <p className="eyebrow">Entretien express</p>
          <h2>Choisissez une question</h2>
        </div>
        <span className="status">
          RAG + OpenAI + voix IA - {maxQuestionsPerSession - askedQuestions} restantes
        </span>
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
                {message.mode === "openai"
                  ? "Reponse generee avec RAG"
                  : message.mode === "precomputed"
                    ? "Reponse preparee"
                    : "Mode demo"}
              </span>
            ) : null}
            <p>{message.content}</p>
            {message.sources?.length ? (
              <details className="sources">
                <summary>Sources consultees</summary>
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
            {message.role === "assistant" && index > 0 ? (
              <button
                className="voiceButton"
                type="button"
                onClick={() => void speak(message.content, index)}
                disabled={isLoading || (preparingAudioIndex === index && audioCache?.index !== index)}
              >
                {speakingIndex === index
                  ? "Stop"
                  : preparingAudioIndex === index
                    ? "Preparation audio..."
                    : "Ecouter"}
              </button>
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
      <p className="voiceDisclosure">La voix est generee par IA uniquement quand vous cliquez.</p>
    </section>
  );
}
