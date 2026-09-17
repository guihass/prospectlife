import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-head", weight: ["600", "700", "800"], display: "swap" });

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
  themeColor: "#070b18",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <div className="bg-glow" aria-hidden />
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="12" cy="9" r="2.5" fill="currentColor" />
              </svg>
            </span>
            Prospect<b>Life</b>
            <span className="brand-tag">grátis</span>
          </Link>
          <nav>
            <Link href="/">Buscar leads</Link>
            <Link href="/como-usar">Como usar</Link>
            <a href="https://github.com/guihass/prospectlife" target="_blank" rel="noreferrer" className="nav-gh">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              GitHub
            </a>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">
          <div className="footer-inner">
            <div>
              <div className="brand" style={{ fontSize: "1.05rem" }}>
                Prospect<b>Life</b>
              </div>
              <p className="muted small">Gratuito e de código aberto. Feito por Guilherme Hass.</p>
            </div>
            <div className="footer-links">
              <Link href="/como-usar">Guia completo</Link>
              <Link href="/como-usar#google">Chave do Google</Link>
              <Link href="/como-usar#funil">Funil de vendas</Link>
              <a href="https://github.com/guihass/prospectlife" target="_blank" rel="noreferrer">
                Código no GitHub
              </a>
            </div>
            <p className="muted small footer-note">
              Use com responsabilidade: respeite a LGPD, não faça spam e converse como gente.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
