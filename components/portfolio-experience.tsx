"use client";

import { useState } from "react";
import { AvatarStage, type AvatarState } from "@/components/avatar-stage";
import { ChatExperience } from "@/components/chat-experience";
import suggestedQuestions from "@/data/suggested-questions.json";

export function PortfolioExperience() {
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");

  return (
    <main className="experienceShell">
      <section className="introPanel" aria-label="Mini entretien avec l'avatar">
        <p className="eyebrow">Portfolio conversationnel</p>
        <h1>Entrez dans un entretien avec mon avatar IA.</h1>
        <p className="lead">
          Une demo web ou un recruteur peut explorer mon profil, mes projets et mes competences
          via un avatar anime, un RAG sur mon corpus et une reponse vocale a la demande.
        </p>

        <div className="stack" aria-label="Technologies demontrees">
          <span>Next.js</span>
          <span>TypeScript</span>
          <span>OpenAI</span>
          <span>RAG</span>
          <span>TTS</span>
        </div>

        <div className="profileLinks" aria-label="Liens portfolio">
          <a href="https://www.linkedin.com/in/benjamin-daumas/" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a href="https://mar25cds-xray.streamlit.app/" target="_blank" rel="noreferrer">
            Demo X-ray
          </a>
        </div>
      </section>

      <AvatarStage state={avatarState} />

      <aside className="profilePanel" aria-label="Profil rapide">
        <div>
          <p className="eyebrow">Cible</p>
          <h2>Data Scientist / AI Engineer</h2>
        </div>
        <dl className="profileFacts">
          <div>
            <dt>Localisation</dt>
            <dd>Toulouse et region</dd>
          </div>
          <div>
            <dt>Secteurs ouverts</dt>
            <dd>Robotique, aeronautique, spatial, medical, defense, industrie avancee</dd>
          </div>
          <div>
            <dt>Angle fort</dt>
            <dd>Relier IA, terrain industriel, systemes reels et comprehension metier</dd>
          </div>
        </dl>
      </aside>

      <ChatExperience
        suggestedQuestions={suggestedQuestions}
        onAvatarStateChange={setAvatarState}
      />
    </main>
  );
}
