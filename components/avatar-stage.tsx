"use client";

import Image from "next/image";

export type AvatarState = "idle" | "thinking" | "speaking" | "error";

type AvatarStageProps = {
  state: AvatarState;
};

const statusCopy: Record<AvatarState, string> = {
  idle: "Disponible pour un entretien IA/Data",
  thinking: "Recherche dans le portfolio",
  speaking: "Reponse vocale en cours",
  error: "Je reprends dans un instant"
};

export function AvatarStage({ state }: AvatarStageProps) {
  return (
    <section className={`avatarStage ${state}`} aria-label="Avatar conversationnel">
      <div className="stageGrid" aria-hidden="true" />
      <div className="avatarStatus">
        <span className="statusDot" />
        {statusCopy[state]}
      </div>

      <div className="portraitFrame">
        <div className="portraitGlow" />
        <div className="portraitImageWrap">
          <Image
            src="/avatar-portrait.png"
            alt="Avatar illustre de Benjamin"
            fill
            priority
            sizes="(max-width: 760px) 86vw, 360px"
            className="portraitImage"
          />
        </div>
      </div>

      <div className="voiceBars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="quickProfile">
        <span>Data Science</span>
        <span>IA appliquee</span>
        <span>Toulouse</span>
      </div>
    </section>
  );
}
