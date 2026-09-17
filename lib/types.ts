export type SiteType = "none" | "social" | "site";

export interface Lead {
  id: string;
  name: string;
  address: string;
  phoneRaw: string | null;      // como veio da fonte
  phoneE164: string | null;     // +5541999999999
  whatsapp: string | null;      // https://wa.me/5541999999999
  website: string | null;       // URL do site real (se tiver)
  siteType: SiteType;           // none = sem nada | social = só rede social | site = tem site
  instagram: string | null;     // @handle
  instagramUrl: string | null;
  instagramConfidence: "alta" | "media" | "fonte" | null;
  phoneType: "celular" | "fixo" | "outro" | null;   // heurística gratuita (Brasil)
  waStatus: "confirmado" | "nao_tem" | "nao_verificado"; // resultado da verificação real
  rating: number | null;
  ratingCount: number | null;
  mapsUrl: string | null;
  source: "google" | "osm";
  city: string;
  niche: string;
  countryCode: string;   // "BR"
  lang: string;          // "pt-BR", "es", "en"... (idioma das mensagens)
  audit?: SiteAudit | null;
}

export type Severity = "alta" | "media" | "baixa";

export interface AuditIssue {
  severity: Severity;
  title: string;
  detail: string;
  pitch: string; // argumento de venda pronto
}

export interface SiteAudit {
  url: string;
  finalUrl: string;
  ok: boolean;
  status: number | null;
  error: string | null;
  score: number; // 0-100 (maior = site melhor)
  issues: AuditIssue[];
  positives: string[];
  mobile: {
    viewport: boolean;
    mediaQueries: boolean;
    responsiveFramework: string | null;
    verdict: "boa" | "duvidosa" | "ruim" | "desconhecida";
  };
  tech: string[];
}

export interface SearchRequest {
  mode: "google" | "osm";
  apiKey?: string;
  countryCode: string;
  city: string;
  niche: string;
  includeWithSite: boolean;
  maxPages?: number;
}

export interface SearchResponse {
  leads: Lead[];
  warnings: string[];
  totalFound: number;
}
