import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProspectLife — IA gratuita de prospecção de clientes",
  description:
    "Encontre empresas sem site na cidade e nicho que você escolher. Receba nome, WhatsApp e Instagram, audite sites fracos e comece a conversa de forma humana. 100% grátis.",
  keywords: ["prospecção", "leads", "empresas sem site", "whatsapp", "instagram", "google maps", "agência", "freelancer"],
  openGraph: {
    title: "ProspectLife — IA gratuita de prospecção",
    description: "Ache empresas sem site, pegue WhatsApp + Instagram e comece a conversa. Grátis.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1020",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-dot" /> Prospect<b>Life</b>
          </Link>
          <nav>
            <Link href="/">Buscar leads</Link>
            <Link href="/como-usar">Como usar</Link>
            <a href="https://github.com/guihass/prospectlife" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">
          ProspectLife é gratuito e de código aberto. Use com responsabilidade: respeite a LGPD, não faça spam e
          converse como gente. Feito por Guilherme Hass.
        </footer>
      </body>
    </html>
  );
}
