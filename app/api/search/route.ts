import { NextResponse } from "next/server";
import type { SearchRequest, SearchResponse } from "@/lib/types";
import { searchGoogle } from "@/lib/google";
import { searchOSM } from "@/lib/osm";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: SearchRequest;
  try {
    body = (await req.json()) as SearchRequest;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const city = (body.city || "").trim();
  const niche = (body.niche || "").trim();
  const countryCode = (body.countryCode || "BR").toUpperCase();
  if (!city || !niche) {
    return NextResponse.json({ error: "Informe cidade e nicho." }, { status: 400 });
  }

  try {
    let result;
    if (body.mode === "google") {
      // A chave pode vir do usuário (recomendado) ou de uma variável de ambiente
      // do servidor (GOOGLE_PLACES_API_KEY) para quem quiser hospedar sua própria cópia.
      const apiKey = (body.apiKey || process.env.GOOGLE_PLACES_API_KEY || "").trim();
      if (!apiKey) {
        return NextResponse.json(
          { error: "Modo Google precisa de uma chave da Google Places API. Veja 'Como usar'." },
          { status: 400 }
        );
      }
      result = await searchGoogle({ apiKey, countryCode, city, niche, maxPages: body.maxPages });
    } else {
      result = await searchOSM({ countryCode, city, niche });
    }

    const leads = body.includeWithSite ? result.leads : result.leads.filter((l) => l.siteType !== "site");

    const resp: SearchResponse = { leads, warnings: result.warnings, totalFound: result.totalFound };
    return NextResponse.json(resp);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
