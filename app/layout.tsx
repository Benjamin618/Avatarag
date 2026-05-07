import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Benjamin - Portfolio RAG Avatar",
  description:
    "Un avatar conversationnel pour permettre aux recruteurs de decouvrir Benjamin avec une experience RAG."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
