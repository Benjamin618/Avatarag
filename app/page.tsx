import { ChatExperience } from "@/components/chat-experience";
import Image from "next/image";

const suggestedQuestions = [
  "Quel type de poste recherches-tu ?",
  "Quels projets montrent tes competences IA ?",
  "Quelle est ta stack technique ?",
  "Pourquoi te contacter pour un entretien ?"
];

export default function Home() {
  return (
    <main className="shell">
      <section className="hero" aria-label="Presentation">
        <div className="avatarWrap">
          <Image src="/avatar.svg" width={176} height={176} alt="Avatar de Benjamin" priority />
          <span className="presence" />
        </div>

        <p className="eyebrow">Portfolio conversationnel</p>
        <h1>Discutez avec mon avatar RAG.</h1>
        <p className="lead">
          Une demo web ou un recruteur peut explorer mon profil, mes projets et mes competences,
          avec des reponses a la premiere personne basees sur un corpus verifiable.
        </p>

        <div className="stack" aria-label="Technologies demontrees">
          <span>Next.js</span>
          <span>TypeScript</span>
          <span>OpenAI</span>
          <span>RAG</span>
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

      <ChatExperience suggestedQuestions={suggestedQuestions} />
    </main>
  );
}
