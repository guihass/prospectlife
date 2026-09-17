"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { COUNTRIES, getCountry } from "@/lib/countries";
import type { Lead, SearchResponse, SiteAudit } from "@/lib/types";
import { prettyPhone, phoneType } from "@/lib/phone";
import { DEFAULT_FUNNELS, LANG_NAMES, PLACEHOLDERS, baseLang, funnelFor, renderTemplate, type FunnelStage, type Funnels } from "@/lib/funnel";
import { verifyReady, type VerifyConfig, type VerifyProvider } from "@/lib/verify";

/* ------------------------------------------------------------------ */
/* Tipos locais                                                        */
/* ------------------------------------------------------------------ */

interface LeadRow extends Lead {
  stage?: number;          // índice da etapa do funil
  notes?: string;          // anotações do usuário
  lastContact?: string;    // ISO date do último contato
  status?: "ativo" | "ganho" | "perdido";
}

interface Config {
  countryCode: string;
  cities: string;
  niches: string;
  mode: "osm" | "google";
  googleKey: string;
  findIg: boolean;
  includeWithSite: boolean;
  doAudit: boolean;
  senderName: string;
  senderBusiness: string;
  funnels: Funnels;        // um funil por idioma (só os editados pelo usuário)
  // verificação de WhatsApp
  verify: boolean;
  verifyProvider: VerifyProvider;
  evoBaseUrl: string;
  evoApiKey: string;
  evoInstance: string;
  zapiInstanceId: string;
  zapiToken: string;
  zapiClientToken: string;
  testNumber: string;
}

const DEFAULT_CONFIG: Config = {
  countryCode: "BR",
  cities: "",
  niches: "",
  mode: "osm",
  googleKey: "",
  findIg: true,
  includeWithSite: false,
  doAudit: true,
  senderName: "",
  senderBusiness: "",
  funnels: {},
  verify: false,
  verifyProvider: "evolution",
  evoBaseUrl: "",
  evoApiKey: "",
  evoInstance: "",
  zapiInstanceId: "",
  zapiToken: "",
  zapiClientToken: "",
  testNumber: "",
};

const LS_CONFIG = "prospectlife.config.v3";
const LS_LEADS = "prospectlife.leads.v2";

type Tab = "todos" | "none" | "social" | "site";
type WaFilter = "todos" | "confirmado" | "celular" | "com_numero";

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function splitList(s: string, allowComma = true): string[] {
  return s
    .split(allowComma ? /[\n,;]+/ : /[\n;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

async function pool<T>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<void>) {
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function scoreClass(score: number): string {
  return score < 40 ? "score-bad" : score < 70 ? "score-mid" : "score-good";
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("todos");
  const [stageFilter, setStageFilter] = useState<number | "all">("all");
  const [waFilter, setWaFilter] = useState<WaFilter>("todos");
  const [showVerify, setShowVerify] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [showFunnelEditor, setShowFunnelEditor] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Carrega/salva tudo no navegador (nada vai para o servidor)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CONFIG);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Config>;
        setCfg({ ...DEFAULT_CONFIG, ...saved, funnels: saved.funnels ?? {} });
      }
      const rawLeads = localStorage.getItem(LS_LEADS);
      if (rawLeads) {
        // Leads salvos por versoes antigas podem nao ter os campos de verificacao
        const parsed = JSON.parse(rawLeads) as LeadRow[];
        setLeads(
          parsed.map((l) => ({
            ...l,
            waStatus: l.waStatus ?? "nao_verificado",
            phoneType: l.phoneType ?? phoneType(l.phoneE164, "55"),
            countryCode: l.countryCode ?? "BR",
            lang: l.lang ?? "pt-BR",
          }))
        );
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_CONFIG, JSON.stringify(cfg));
    } catch {}
  }, [cfg, loaded]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_LEADS, JSON.stringify(leads.slice(0, 2000)));
    } catch {}
  }, [leads, loaded]);

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const addLog = useCallback((s: string) => setLog((l) => [...l.slice(-200), `${new Date().toLocaleTimeString()} ${s}`]), []);
  const updateLead = useCallback((id: string, patch: Partial<LeadRow>) => {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const verifyConfig: VerifyConfig = useMemo(
    () => ({
      provider: cfg.verifyProvider,
      evoBaseUrl: cfg.evoBaseUrl,
      evoApiKey: cfg.evoApiKey,
      evoInstance: cfg.evoInstance,
      zapiInstanceId: cfg.zapiInstanceId,
      zapiToken: cfg.zapiToken,
      zapiClientToken: cfg.zapiClientToken,
    }),
    [cfg]
  );
  const canVerify = verifyReady(verifyConfig);

  /* ---------------- Verificação de WhatsApp ---------------- */

  const verifyLeads = useCallback(
    async (targets: LeadRow[], signal?: AbortSignal) => {
      const need = targets.filter((l) => l.phoneE164 && l.waStatus !== "confirmado");
      if (!need.length) return;
      setVerifying(true);
      setProgress({ done: 0, total: need.length, label: "Verificando WhatsApp…" });
      let done = 0;
      const batch = cfg.verifyProvider === "evolution" ? 50 : 10;
      for (let i = 0; i < need.length; i += batch) {
        if (signal?.aborted) break;
        const chunk = need.slice(i, i + batch);
        try {
          const res = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: verifyConfig, numbers: chunk.map((l) => l.phoneE164) }),
            signal,
          });
          const data = (await res.json()) as { results: { number: string; exists: boolean }[]; error?: string | null };
          if (data.error) {
            addLog(`  ✗ verificação: ${data.error}`);
            if (!data.results?.length) break;
          }
          for (const l of chunk) {
            const digits = (l.phoneE164 || "").replace(/\D/g, "");
            const r = data.results?.find((x) => x.number === digits);
            if (r) updateLead(l.id, { waStatus: r.exists ? "confirmado" : "nao_tem" });
          }
          const ok = data.results?.filter((r) => r.exists).length ?? 0;
          addLog(`  ✓ ${chunk.length} números verificados: ${ok} têm WhatsApp`);
        } catch (e) {
          if (signal?.aborted) break;
          addLog(`  ✗ verificação: ${e instanceof Error ? e.message : "erro"}`);
        }
        done += chunk.length;
        setProgress({ done, total: need.length, label: "Verificando WhatsApp…" });
      }
      setVerifying(false);
    },
    [cfg.verifyProvider, verifyConfig, addLog, updateLead]
  );

  const testVerify = async () => {
    setTestResult(null);
    const to = cfg.testNumber.replace(/\D/g, "");
    if (!to) {
      setTestResult("Digite seu número com DDI (ex.: 5541999999999).");
      return;
    }
    setTestResult("Verificando…");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: verifyConfig, numbers: [to] }),
      });
      const data = (await res.json()) as { results: { exists: boolean }[]; error?: string | null };
      if (data.error) setTestResult("Falhou: " + data.error);
      else setTestResult(data.results[0]?.exists ? "✅ Conexão OK — esse número tem WhatsApp." : "Conexão OK, mas o WhatsApp diz que esse número não tem conta.");
    } catch (e) {
      setTestResult("Falhou: " + (e instanceof Error ? e.message : "erro"));
    }
  };

  /* ---------------- Busca ---------------- */

  const runSearch = async () => {
    setError(null);
    setWarnings([]);
    setLog([]);
    const cities = splitList(cfg.cities, false);
    const niches = splitList(cfg.niches);
    if (!cities.length || !niches.length) {
      setError("Preencha pelo menos uma cidade e um nicho.");
      return;
    }
    if (cfg.mode === "google" && !cfg.googleKey.trim()) {
      setError("O modo Google precisa da sua chave da Google Places API (é grátis até US$ 200/mês). Veja 'Como usar' ou troque para o modo gratuito.");
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRunning(true);

    const combos = cities.flatMap((city) => niches.map((niche) => ({ city, niche })));
    setProgress({ done: 0, total: combos.length, label: "Buscando empresas…" });

    const existingIds = new Set(leads.map((l) => l.id));
    const existingKeys = new Set(leads.map((l) => l.phoneE164 || l.name.toLowerCase() + "|" + l.city.toLowerCase()));
    const found: LeadRow[] = [];
    const warns: string[] = [];

    for (let i = 0; i < combos.length; i++) {
      if (ctrl.signal.aborted) break;
      const { city, niche } = combos[i];
      addLog(`Buscando "${niche}" em ${city}…`);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: cfg.mode,
            apiKey: cfg.googleKey,
            countryCode: cfg.countryCode,
            city,
            niche,
            includeWithSite: cfg.includeWithSite,
          }),
          signal: ctrl.signal,
        });
        const data = (await res.json()) as SearchResponse & { error?: string };
        if (!res.ok || data.error) {
          addLog(`  ✗ ${data.error || "erro"}`);
          warns.push(`${niche} em ${city}: ${data.error || "erro"}`);
        } else {
          let added = 0;
          for (const l of data.leads) {
            const key = l.phoneE164 || l.name.toLowerCase() + "|" + l.city.toLowerCase();
            if (existingIds.has(l.id) || existingKeys.has(key)) continue;
            existingIds.add(l.id);
            existingKeys.add(key);
            found.push({ ...l, stage: 0, status: "ativo" });
            added++;
          }
          addLog(`  ✓ ${data.totalFound} encontradas, ${added} novas`);
          for (const w of data.warnings) if (!warns.includes(w)) warns.push(w);
        }
      } catch (e) {
        if (ctrl.signal.aborted) break;
        addLog(`  ✗ ${e instanceof Error ? e.message : "erro"}`);
      }
      setProgress({ done: i + 1, total: combos.length, label: "Buscando empresas…" });
    }

    setLeads((ls) => [...found, ...ls]);
    setWarnings(warns);

    if (cfg.verify && canVerify && !ctrl.signal.aborted) {
      await verifyLeads(found, ctrl.signal);
    } else if (cfg.verify && !canVerify) {
      warns.push("Verificação de WhatsApp ligada, mas nenhum provedor configurado. Clique em 'Configurar' na opção de verificação.");
      setWarnings([...warns]);
    }

    if (cfg.findIg && !ctrl.signal.aborted) {
      const need = found.filter((l) => !l.instagram);
      setProgress({ done: 0, total: need.length, label: "Procurando Instagram…" });
      let done = 0;
      await pool(need, 2, async (l) => {
        if (ctrl.signal.aborted) return;
        try {
          const res = await fetch("/api/instagram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: l.name, city: l.city }),
            signal: ctrl.signal,
          });
          const data = (await res.json()) as { result: { handle: string; url: string; confidence: "alta" | "media" } | null };
          if (data.result) {
            updateLead(l.id, { instagram: data.result.handle, instagramUrl: data.result.url, instagramConfidence: data.result.confidence });
            addLog(`  @${data.result.handle} → ${l.name} (${data.result.confidence})`);
          }
        } catch {}
        done++;
        setProgress({ done, total: need.length, label: "Procurando Instagram…" });
      });
    }

    if (cfg.includeWithSite && cfg.doAudit && !ctrl.signal.aborted) {
      const need = found.filter((l) => l.siteType === "site" && l.website);
      setProgress({ done: 0, total: need.length, label: "Auditando sites…" });
      let done = 0;
      await pool(need, 3, async (l) => {
        if (ctrl.signal.aborted) return;
        try {
          const res = await fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: l.website }),
            signal: ctrl.signal,
          });
          const data = (await res.json()) as { audit: SiteAudit | null };
          if (data.audit) {
            updateLead(l.id, { audit: data.audit });
            addLog(`  🔎 ${l.name}: nota ${data.audit.score}/100, mobile ${data.audit.mobile.verdict}`);
          }
        } catch {}
        done++;
        setProgress({ done, total: need.length, label: "Auditando sites…" });
      });
    }

    addLog(ctrl.signal.aborted ? "Busca interrompida." : `Concluído: ${found.length} novos leads.`);
    setProgress((p) => ({ ...p, label: ctrl.signal.aborted ? "Interrompido" : "Concluído" }));
    setRunning(false);
    abortRef.current = null;
  };

  const stopSearch = () => abortRef.current?.abort();

  /* ---------------- Funil ---------------- */

  const me = { name: cfg.senderName, business: cfg.senderBusiness };
  const countryLang = getCountry(cfg.countryCode).lang;          // idioma do país selecionado
  const [editLang, setEditLang] = useState<string | null>(null);  // idioma sendo editado (null = o do país)
  const activeLang = baseLang(editLang ?? countryLang);
  const funnel = funnelFor(cfg.funnels, activeLang);               // funil mostrado/editado
  const hasTranslation = !!DEFAULT_FUNNELS[activeLang];
  const langLabel = LANG_NAMES[activeLang] ?? activeLang.toUpperCase();
  const isCustom = !!cfg.funnels[activeLang]?.length;

  const saveFunnel = (stages: FunnelStage[]) => set("funnels", { ...cfg.funnels, [activeLang]: stages });
  const setStage = (i: number, patch: Partial<FunnelStage>) => saveFunnel(funnel.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addStage = () => saveFunnel([...funnel, { id: "etapa_" + Date.now(), name: `${funnel.length + 1}. Nova etapa`, text: "" }]);
  const removeStage = (i: number) => {
    if (funnel.length <= 1) return;
    if (!confirm(`Remover a etapa "${funnel[i].name}"? Leads nessa etapa voltam para a anterior.`)) return;
    saveFunnel(funnel.filter((_, idx) => idx !== i));
    setLeads((ls) => ls.map((l) => (baseLang(l.lang) === activeLang && (l.stage ?? 0) >= i && (l.stage ?? 0) > 0 ? { ...l, stage: (l.stage ?? 0) - 1 } : l)));
  };
  const moveStage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= funnel.length) return;
    const arr = [...funnel];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    saveFunnel(arr);
  };
  const resetFunnel = () => {
    if (!confirm(`Voltar o funil em ${langLabel} para os textos sugeridos? Suas edições nesse idioma serão perdidas.`)) return;
    const next = { ...cfg.funnels };
    delete next[activeLang];
    set("funnels", next);
  };
  const funnelOf = (l: LeadRow) => funnelFor(cfg.funnels, l.lang || "pt-BR");

  const advance = (l: LeadRow) => {
    const next = Math.min((l.stage ?? 0) + 1, funnelOf(l).length - 1);
    updateLead(l.id, { stage: next, lastContact: new Date().toISOString() });
  };

  /* ---------------- Exportar / limpar ---------------- */

  const exportCsv = () => {
    const header = ["Empresa", "Telefone", "Tipo", "WhatsApp verificado", "WhatsApp", "Instagram", "Situação do site", "Site", "Nota do site", "Mobile", "Cidade", "Nicho", "Endereço", "Avaliação", "Etapa do funil", "Status", "Último contato", "Anotações", "Fonte", "Google Maps"];
    const rows = visible.map((l) => [
      l.name,
      prettyPhone(l.phoneE164),
      l.phoneType ?? "",
      l.waStatus === "confirmado" ? "Sim" : l.waStatus === "nao_tem" ? "Não" : "Não verificado",
      l.whatsapp ?? "",
      l.instagram ? "@" + l.instagram : "",
      l.siteType === "none" ? "Sem site" : l.siteType === "social" ? "Só rede social" : "Tem site",
      l.website ?? "",
      l.audit ? l.audit.score : "",
      l.audit ? l.audit.mobile.verdict : "",
      l.city,
      l.niche,
      l.address,
      l.rating ? `${l.rating} (${l.ratingCount})` : "",
      funnelOf(l)[l.stage ?? 0]?.name ?? "",
      l.status ?? "ativo",
      l.lastContact ? new Date(l.lastContact).toLocaleDateString("pt-BR") : "",
      l.notes ?? "",
      l.source,
      l.mapsUrl ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `prospectlife-leads-${todayKey()}.csv`;
    a.click();
  };

  const clearLeads = () => {
    if (confirm("Apagar todos os leads da lista?")) setLeads([]);
  };

  /* ---------------- Derivados ---------------- */

  const visible = useMemo(() => {
    let v = tab === "todos" ? leads : leads.filter((l) => l.siteType === tab);
    if (stageFilter !== "all") v = v.filter((l) => (l.stage ?? 0) === stageFilter);
    if (waFilter === "confirmado") v = v.filter((l) => l.waStatus === "confirmado");
    else if (waFilter === "celular") v = v.filter((l) => l.phoneType === "celular" && l.waStatus !== "nao_tem");
    else if (waFilter === "com_numero") v = v.filter((l) => l.phoneE164 && l.waStatus !== "nao_tem");
    return v;
  }, [leads, tab, stageFilter, waFilter]);

  const counts = useMemo(
    () => ({
      todos: leads.length,
      none: leads.filter((l) => l.siteType === "none").length,
      social: leads.filter((l) => l.siteType === "social").length,
      site: leads.filter((l) => l.siteType === "site").length,
      wa: leads.filter((l) => l.whatsapp && l.waStatus !== "nao_tem").length,
      waOk: leads.filter((l) => l.waStatus === "confirmado").length,
      waNo: leads.filter((l) => l.waStatus === "nao_tem").length,
      celular: leads.filter((l) => l.phoneType === "celular" && l.waStatus !== "nao_tem").length,
      unverified: leads.filter((l) => l.phoneE164 && l.waStatus === "nao_verificado").length,
      ig: leads.filter((l) => l.instagram).length,
      ganhos: leads.filter((l) => l.status === "ganho").length,
    }),
    [leads]
  );
  const stageCounts = useMemo(() => funnel.map((_, i) => leads.filter((l) => (l.stage ?? 0) === i && l.status !== "perdido").length), [funnel, leads]);
  const langsInUse = useMemo(() => Array.from(new Set(leads.map((l) => baseLang(l.lang || "pt-BR")))), [leads]);
  const editableLangs = useMemo(() => Array.from(new Set([baseLang(countryLang), ...Object.keys(DEFAULT_FUNNELS), ...Object.keys(cfg.funnels), ...langsInUse])), [countryLang, cfg.funnels, langsInUse]);

  /* ------------------------------------------------------------------ */

  return (
    <>
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="dot" /> 100% gratuito · sem cadastro · Brasil e mais 60 países
        </div>
        <h1>
          Encontre empresas <span>sem site</span>
          <br />e leve cada uma pelo seu funil
        </h1>
        <p>
          Escolha o país, as cidades e o nicho. O ProspectLife entrega <b>nome, WhatsApp e Instagram</b>, audita sites fracos e organiza
          a conversa em etapas escritas por você. <Link href="/como-usar">Primeira vez? Leia o guia →</Link>
        </p>
        <div className="hero-chips">
          <span className="chip"><i>🔍</i> Busca por cidade + nicho</span>
          <span className="chip"><i>💬</i> WhatsApp pronto</span>
          <span className="chip"><i>📸</i> Instagram</span>
          <span className="chip"><i>🔎</i> Auditoria de site</span>
          <span className="chip"><i>🪜</i> Funil de vendas</span>
          <span className="chip"><i>⬇</i> Exporta CSV</span>
        </div>
      </section>

      {/* ---------------- 1. Busca ---------------- */}
      <section className="card">
        <h2>
          <span className="step-num">1</span> O que você quer prospectar?
        </h2>
        <p className="hint">Várias cidades (uma por linha) e vários nichos (um por linha ou separados por vírgula). O app busca todas as combinações.</p>
        <div className="grid">
          <div className="field">
            <label>País</label>
            <select value={cfg.countryCode} onChange={(e) => set("countryCode", e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} (+{c.dial})
                </option>
              ))}
            </select>
            <small>Brasil vem selecionado. Para outros países, os números de WhatsApp são montados com o DDI certo.</small>
          </div>
          <div className="field">
            <label>Cidades</label>
            <textarea placeholder={"Curitiba, PR\nSão José dos Pinhais, PR\nJoinville, SC"} value={cfg.cities} onChange={(e) => set("cities", e.target.value)} />
            <small>Dica: escreva “Cidade, Estado” para evitar cidades com o mesmo nome.</small>
          </div>
          <div className="field">
            <label>Nichos</label>
            <textarea placeholder={"pizzaria\nbarbearia\nclínica de estética"} value={cfg.niches} onChange={(e) => set("niches", e.target.value)} />
            <small>Use termos como as pessoas pesquisam no Google: “dentista”, “pet shop”, “oficina mecânica”.</small>
          </div>
        </div>

        <h3>Fonte dos dados</h3>
        <div className="radio-row">
          <label className={cfg.mode === "osm" ? "active" : ""}>
            <input type="radio" name="mode" checked={cfg.mode === "osm"} onChange={() => set("mode", "osm")} />
            <span>
              <b>Modo gratuito (OpenStreetMap)</b>
              <br />
              <small className="muted">Sem chave, sem cadastro. Menos telefones cadastrados.</small>
            </span>
          </label>
          <label className={cfg.mode === "google" ? "active" : ""}>
            <input type="radio" name="mode" checked={cfg.mode === "google"} onChange={() => set("mode", "google")} />
            <span>
              <b>Modo Google (recomendado)</b>
              <br />
              <small className="muted">Usa sua chave da Google Places — telefone e site de quase todas.</small>
            </span>
          </label>
        </div>
        {cfg.mode === "google" && (
          <div className="field mt">
            <label>Sua chave da Google Places API</label>
            <input type="password" placeholder="AIza..." value={cfg.googleKey} onChange={(e) => set("googleKey", e.target.value)} autoComplete="off" />
            <small>
              A chave fica salva só no seu navegador. O Google dá US$ 200/mês grátis (~5.000 buscas). <Link href="/como-usar#google">Passo a passo para criar a chave →</Link>
            </small>
          </div>
        )}

        <h3>Opções</h3>
        <label className="check">
          <input type="checkbox" checked={cfg.findIg} onChange={(e) => set("findIg", e.target.checked)} />
          <span>
            Procurar o <b>Instagram</b> de cada empresa <span className="muted small">(deixa a busca um pouco mais lenta)</span>
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={cfg.includeWithSite} onChange={(e) => set("includeWithSite", e.target.checked)} />
          <span>
            Incluir também empresas que <b>já têm site</b> <span className="muted small">(para auditar e achar sites fracos)</span>
          </span>
        </label>
        {cfg.includeWithSite && (
          <label className="check" style={{ paddingLeft: 28 }}>
            <input type="checkbox" checked={cfg.doAudit} onChange={(e) => set("doAudit", e.target.checked)} />
            <span>
              <b>Auditar</b> os sites: inconsistências, segurança, SEO e problemas de visualização no celular
            </span>
          </label>
        )}

        <label className="check">
          <input type="checkbox" checked={cfg.verify} onChange={(e) => set("verify", e.target.checked)} />
          <span>
            <b>Verificar se o número tem WhatsApp</b> antes de mostrar{" "}
            <span className="muted small">(precisa conectar um número seu — {canVerify ? "✓ conectado" : "não configurado"})</span>{" "}
            <button className="btn btn-secondary btn-sm" onClick={() => setShowVerify((v) => !v)} type="button">
              {showVerify ? "Ocultar" : "Configurar"}
            </button>
          </span>
        </label>
        {showVerify && (
          <div className="card">
            <p className="hint">
              O WhatsApp não tem consulta pública. Para saber se um número tem conta, o app pergunta ao WhatsApp usando <b>um número seu conectado</b>. Sem isso, o app
              usa o tipo do número (celular / fixo) como pista gratuita. <Link href="/como-usar#verificar">Como configurar →</Link>
            </p>
            <div className="radio-row">
              <label className={cfg.verifyProvider === "evolution" ? "active" : ""}>
                <input type="radio" name="vprov" checked={cfg.verifyProvider === "evolution"} onChange={() => set("verifyProvider", "evolution")} />
                <span>
                  <b>Evolution API</b> (grátis, servidor seu)
                  <br />
                  <small className="muted">Open-source. Lê o QR Code do seu WhatsApp. Verifica 50 números por vez.</small>
                </span>
              </label>
              <label className={cfg.verifyProvider === "zapi" ? "active" : ""}>
                <input type="radio" name="vprov" checked={cfg.verifyProvider === "zapi"} onChange={() => set("verifyProvider", "zapi")} />
                <span>
                  <b>Z-API</b> (serviço pago, sem servidor)
                  <br />
                  <small className="muted">Cadastro em z-api.io, conecta pelo QR Code. Plano a partir de ~R$100/mês.</small>
                </span>
              </label>
            </div>
            {cfg.verifyProvider === "evolution" ? (
              <div className="grid mt">
                <div className="field">
                  <label>URL da Evolution API</label>
                  <input type="text" placeholder="https://evo.seudominio.com" value={cfg.evoBaseUrl} onChange={(e) => set("evoBaseUrl", e.target.value)} />
                </div>
                <div className="field">
                  <label>API Key (apikey)</label>
                  <input type="password" value={cfg.evoApiKey} onChange={(e) => set("evoApiKey", e.target.value)} autoComplete="off" />
                </div>
                <div className="field">
                  <label>Nome da instância</label>
                  <input type="text" placeholder="prospectlife" value={cfg.evoInstance} onChange={(e) => set("evoInstance", e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="grid mt">
                <div className="field">
                  <label>Instance ID</label>
                  <input type="text" value={cfg.zapiInstanceId} onChange={(e) => set("zapiInstanceId", e.target.value)} />
                </div>
                <div className="field">
                  <label>Token da instância</label>
                  <input type="password" value={cfg.zapiToken} onChange={(e) => set("zapiToken", e.target.value)} autoComplete="off" />
                </div>
                <div className="field">
                  <label>Client-Token (segurança da conta)</label>
                  <input type="password" value={cfg.zapiClientToken} onChange={(e) => set("zapiClientToken", e.target.value)} autoComplete="off" />
                </div>
              </div>
            )}
            <div className="row mt">
              <input type="text" placeholder="Seu número para teste (5541999999999)" value={cfg.testNumber} onChange={(e) => set("testNumber", e.target.value)} style={{ maxWidth: 320 }} />
              <button className="btn btn-secondary btn-sm" onClick={testVerify} disabled={!canVerify} type="button">
                Testar conexão
              </button>
              {testResult && <span className="small">{testResult}</span>}
            </div>
          </div>
        )}

        <div className="actions">
          {!running ? (
            <button className="btn btn-primary" onClick={runSearch}>
              🔍 Buscar leads
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopSearch}>
              ■ Parar
            </button>
          )}
          {leads.length > 0 && (
            <>
              <button className="btn btn-secondary" onClick={exportCsv}>
                ⬇ Exportar CSV (Excel)
              </button>
              <button className="btn btn-secondary" onClick={clearLeads}>
                🗑 Limpar lista
              </button>
            </>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {(running || progress.total > 0) && (
          <div className="progress">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="small">{progress.label}</span>
              <span className="small muted">
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="progress-bar">
              <div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
            {log.length > 0 && (
              <div className="log">
                {log.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {warnings.map((w, i) => (
          <div key={i} className="alert alert-warn">
            {w}
          </div>
        ))}
      </section>

      {/* ---------------- 2. Funil ---------------- */}
      <section className="card">
        <h2>
          <span className="step-num">2</span> Seu funil de vendas
        </h2>
        <p className="hint">
          Você escreve os textos de cada etapa uma vez, por idioma. Em cada lead, o botão <b>Abrir WhatsApp</b> leva o texto da etapa em que ele está, <b>no idioma
          do país dele</b>, com nome da empresa e cidade preenchidos. Os textos sugeridos existem em português, espanhol, inglês, francês, italiano e alemão —
          mude tudo do seu jeito.
        </p>
        <div className="grid">
          <div className="field">
            <label>Seu nome</label>
            <input type="text" placeholder="Guilherme" value={cfg.senderName} onChange={(e) => set("senderName", e.target.value)} />
          </div>
          <div className="field">
            <label>Sua empresa (opcional)</label>
            <input type="text" placeholder="Life Web" value={cfg.senderBusiness} onChange={(e) => set("senderBusiness", e.target.value)} />
          </div>
        </div>

        <div className="pipeline mt">
          {funnel.map((s, i) => (
            <button key={s.id} className={`pipe-stage ${stageFilter === i ? "active" : ""}`} onClick={() => setStageFilter(stageFilter === i ? "all" : i)} title="Filtrar leads nesta etapa">
              <b>{stageCounts[i] ?? 0}</b>
              <span>{s.name}</span>
            </button>
          ))}
        </div>

        <div className="actions" style={{ marginTop: 14 }}>
          <button className="btn btn-secondary" onClick={() => setShowFunnelEditor((v) => !v)}>
            {showFunnelEditor ? "Fechar editor" : `✏️ Editar textos do funil (${langLabel})`}
          </button>
          <span className="row" style={{ gap: 6 }}>
            <span className="small muted">Idioma:</span>
            <select value={activeLang} onChange={(e) => setEditLang(e.target.value)} style={{ width: "auto", padding: "7px 30px 7px 10px", fontSize: "0.88rem" }}>
              {editableLangs.map((l) => (
                <option key={l} value={l}>
                  {LANG_NAMES[l] ?? l.toUpperCase()}
                  {l === baseLang(countryLang) ? " (país selecionado)" : ""}
                  {cfg.funnels[l]?.length ? " ✎" : ""}
                </option>
              ))}
            </select>
          </span>
          {showFunnelEditor && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={addStage}>
                + Nova etapa
              </button>
              <button className="btn btn-secondary btn-sm" onClick={resetFunnel}>
                ↺ Restaurar sugestões
              </button>
            </>
          )}
        </div>

        {showFunnelEditor && (
          <div className="card">
            {!hasTranslation && !isCustom && (
              <div className="alert alert-warn" style={{ marginTop: 0 }}>
                Ainda não há sugestão de textos em {langLabel}. Estou mostrando o funil em inglês — traduza e salve, e ele passa a valer para esse idioma.
              </div>
            )}
            <p className="hint">
              Editando o funil em <b>{langLabel}</b>{isCustom ? " (personalizado)" : " (sugestão)"}. Variáveis que você pode usar (trocadas automaticamente):{" "}
              {PLACEHOLDERS.map((p) => (
                <span key={p.key} className="var-chip" title={p.desc}>
                  {p.key}
                </span>
              ))}
            </p>
            <div className="stage-list">
              {funnel.map((s, i) => (
                <div key={s.id} className="stage-edit">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <input type="text" value={s.name} onChange={(e) => setStage(i, { name: e.target.value })} style={{ maxWidth: 280, fontWeight: 700 }} />
                    <div className="row">
                      <button className="btn btn-secondary btn-sm" onClick={() => moveStage(i, -1)} disabled={i === 0} title="Subir">
                        ↑
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => moveStage(i, 1)} disabled={i === funnel.length - 1} title="Descer">
                        ↓
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => removeStage(i)} disabled={funnel.length <= 1}>
                        Remover
                      </button>
                    </div>
                  </div>
                  <textarea value={s.text} onChange={(e) => setStage(i, { text: e.target.value })} placeholder="Escreva a mensagem desta etapa…" />
                  <small className="muted">
                    Prévia:{" "}
                    <i>
                      {renderTemplate(s.text, { name: "Pizzaria do Zé", city: "Curitiba", niche: "Pizzaria", lang: activeLang } as Lead, me) || "—"}
                    </i>
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ---------------- 3. Leads ---------------- */}
      {leads.length > 0 && (
        <section className="card">
          <h2>
            <span className="step-num">3</span> Leads encontrados
          </h2>
          <div className="stats">
            <div className="stat">
              <span className="stat-icon">🏪</span>
              <div>
                <b>{counts.todos}</b>
                <span>empresas</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon orange">🚫</span>
              <div>
                <b>{counts.none + counts.social}</b>
                <span>sem site</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon green">💬</span>
              <div>
                <b>{counts.wa}</b>
                <span>com número</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon green">✅</span>
              <div>
                <b>{counts.waOk}</b>
                <span>WhatsApp confirmado</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon pink">📸</span>
              <div>
                <b>{counts.ig}</b>
                <span>com Instagram</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-icon green">🏆</span>
              <div>
                <b>{counts.ganhos}</b>
                <span>fechados</span>
              </div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <div className="tabs">
              {(
                [
                  ["todos", `Todos (${counts.todos})`],
                  ["none", `Sem site (${counts.none})`],
                  ["social", `Só Instagram/Facebook (${counts.social})`],
                  ["site", `Com site — auditados (${counts.site})`],
                ] as [Tab, string][]
              ).map(([k, label]) => (
                <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="row">
              <select value={waFilter} onChange={(e) => setWaFilter(e.target.value as WaFilter)} style={{ width: "auto", padding: "8px 34px 8px 12px", fontSize: "0.88rem" }}>
                <option value="todos">Telefone: todos</option>
                <option value="com_numero">Só com número ({counts.wa})</option>
                <option value="celular">Só celulares ({counts.celular})</option>
                <option value="confirmado">Só WhatsApp confirmado ({counts.waOk})</option>
              </select>
              {stageFilter !== "all" && (
                <button className="btn btn-secondary btn-sm" onClick={() => setStageFilter("all")}>
                  ✕ Filtro: {funnel[stageFilter]?.name}
                </button>
              )}
            </div>
          </div>
          {counts.unverified > 0 && (
            <div className={`alert ${canVerify ? "alert-info" : "alert-warn"}`}>
              <span>
                {counts.unverified} número{counts.unverified > 1 ? "s" : ""} ainda não verificado{counts.unverified > 1 ? "s" : ""} no WhatsApp.{" "}
                {canVerify ? (
                  <button className="btn btn-secondary btn-sm" onClick={() => verifyLeads(leads)} disabled={verifying || running} type="button">
                    {verifying ? "Verificando…" : "Verificar agora"}
                  </button>
                ) : (
                  <>
                    Para confirmar quem tem WhatsApp,{" "}
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setShowVerify(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                      conecte um número
                    </button>
                    . Enquanto isso, prefira os <b>celulares</b> (quase sempre têm WhatsApp).
                  </>
                )}
              </span>
            </div>
          )}
          {counts.waNo > 0 && waFilter === "todos" && (
            <p className="hint mt">
              {counts.waNo} número{counts.waNo > 1 ? "s" : ""} sem WhatsApp aparece{counts.waNo > 1 ? "m" : ""} riscado{counts.waNo > 1 ? "s" : ""}; use o filtro para esconder.
            </p>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>WhatsApp</th>
                  <th>Instagram</th>
                  <th>Site</th>
                  <th>Etapa do funil</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <LeadRowView
                    key={l.id}
                    lead={l}
                    funnel={funnelOf(l)}
                    me={me}
                    open={open === l.id}
                    onToggle={() => setOpen(open === l.id ? null : l.id)}
                    onChange={(patch) => updateLead(l.id, patch)}
                    onAdvance={() => advance(l)}
                  />
                ))}
              </tbody>
            </table>
            {visible.length === 0 && <p className="hint" style={{ padding: 16 }}>Nenhum lead com esse filtro.</p>}
          </div>
          <p className="hint mt">
            Os leads e o funil ficam salvos no seu navegador. Exporte em CSV para abrir no Excel/Google Sheets. Respeite quem pedir para não receber mais mensagens.
          </p>
        </section>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Linha da tabela                                                     */
/* ------------------------------------------------------------------ */

function LeadRowView({
  lead: l,
  funnel,
  me,
  open,
  onToggle,
  onChange,
  onAdvance,
}: {
  lead: LeadRow;
  funnel: FunnelStage[];
  me: { name: string; business: string };
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<LeadRow>) => void;
  onAdvance: () => void;
}) {
  const stageIdx = Math.min(l.stage ?? 0, funnel.length - 1);
  const stage = funnel[stageIdx];
  const text = stage ? renderTemplate(stage.text, l, me) : "";
  const waLink = l.whatsapp && l.waStatus !== "nao_tem" ? (text ? `${l.whatsapp}?text=${encodeURIComponent(text)}` : l.whatsapp) : null;
  const isLast = stageIdx >= funnel.length - 1;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <>
      <tr className={l.status === "perdido" ? "row-lost" : l.status === "ganho" ? "row-won" : ""}>
        <td>
          <b>{l.name}</b>
          <span className="sub">
            {l.niche} · {l.city}
            {l.countryCode && l.countryCode !== "BR" ? ` · ${l.countryCode} (${LANG_NAMES[baseLang(l.lang)] ?? baseLang(l.lang)})` : ""}
            {l.rating ? ` · ★ ${l.rating} (${l.ratingCount})` : ""}
          </span>
          <span className="sub">{l.address}</span>
          {l.mapsUrl && (
            <a className="sub" href={l.mapsUrl} target="_blank" rel="noreferrer">
              Ver no Google Maps
            </a>
          )}
        </td>
        <td>
          {l.phoneE164 ? (
            <>
              <span style={l.waStatus === "nao_tem" ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>{prettyPhone(l.phoneE164)}</span>
              <div className="row" style={{ gap: 4, marginTop: 4 }}>
                {l.waStatus === "confirmado" && <span className="badge badge-ok">WhatsApp ✓</span>}
                {l.waStatus === "nao_tem" && <span className="badge badge-none">sem WhatsApp</span>}
                {l.waStatus === "nao_verificado" && l.phoneType === "celular" && <span className="badge badge-site" title="Celular: quase sempre tem WhatsApp">celular</span>}
                {l.waStatus === "nao_verificado" && l.phoneType === "fixo" && <span className="badge badge-social" title="Fixo: só tem WhatsApp se for Business">fixo</span>}
              </div>
            </>
          ) : (
            <span className="muted">{l.phoneRaw ? `sem WhatsApp (${l.phoneRaw})` : "não informado"}</span>
          )}
        </td>
        <td>
          {l.instagram ? (
            <a href={l.instagramUrl ?? `https://instagram.com/${l.instagram}`} target="_blank" rel="noreferrer">
              @{l.instagram}
              {l.instagramConfidence && l.instagramConfidence !== "fonte" && <span className="sub">confiança {l.instagramConfidence}</span>}
            </a>
          ) : (
            <span className="muted">não achei</span>
          )}
        </td>
        <td>
          {l.siteType === "none" && <span className="badge badge-none">Sem site</span>}
          {l.siteType === "social" && <span className="badge badge-social">Só rede social</span>}
          {l.siteType === "site" && (
            <>
              <span className="badge badge-site">Tem site</span>
              {l.audit && (
                <div style={{ marginTop: 6 }}>
                  <span className={`score ${scoreClass(l.audit.score)}`}>{l.audit.score}/100</span>
                  <span className="sub">mobile: {l.audit.mobile.verdict}</span>
                  <span className="sub">{l.audit.issues.length} problemas</span>
                </div>
              )}
              {l.website && (
                <a className="sub" href={l.website} target="_blank" rel="noreferrer">
                  {l.website.replace(/^https?:\/\//, "").slice(0, 40)}
                </a>
              )}
            </>
          )}
        </td>
        <td style={{ minWidth: 200 }}>
          <select value={stageIdx} onChange={(e) => onChange({ stage: Number(e.target.value) })} style={{ padding: "7px 30px 7px 10px", fontSize: "0.88rem" }}>
            {funnel.map((s, i) => (
              <option key={s.id} value={i}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="row" style={{ marginTop: 6, gap: 6 }}>
            <select value={l.status ?? "ativo"} onChange={(e) => onChange({ status: e.target.value as LeadRow["status"] })} style={{ padding: "5px 26px 5px 8px", fontSize: "0.8rem", width: "auto" }}>
              <option value="ativo">Em andamento</option>
              <option value="ganho">🏆 Fechado</option>
              <option value="perdido">Perdido</option>
            </select>
            {l.lastContact && <span className="sub" style={{ marginTop: 0 }}>último contato {fmtDate(l.lastContact)}</span>}
          </div>
        </td>
        <td>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {waLink ? (
              <a className="btn btn-wa btn-sm" href={waLink} target="_blank" rel="noreferrer" onClick={() => onChange({ lastContact: new Date().toISOString() })}>
                💬 Abrir WhatsApp
              </a>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={copy} title="Copiar texto da etapa">
                📋 Copiar texto
              </button>
            )}
            {l.instagramUrl && (
              <a className="btn btn-ig btn-sm" href={l.instagramUrl} target="_blank" rel="noreferrer">
                📸 Instagram
              </a>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onAdvance} disabled={isLast} title="Marcar contato feito e ir para a próxima etapa">
              ➜ Próxima etapa
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onToggle}>
              {open ? "Fechar" : "Detalhes"}
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="row-details">
          <td colSpan={6}>
            <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
              <div>
                <h3 style={{ marginTop: 0 }}>Mensagem desta etapa ({stage?.name})</h3>
                <div className="msg-box">{text || "Esta etapa está sem texto. Edite o funil na seção 2."}</div>
                <div className="row mt">
                  <button className="btn btn-secondary btn-sm" onClick={copy}>
                    📋 Copiar
                  </button>
                  {waLink && (
                    <a className="btn btn-wa btn-sm" href={waLink} target="_blank" rel="noreferrer" onClick={() => onChange({ lastContact: new Date().toISOString() })}>
                      💬 Abrir WhatsApp com este texto
                    </a>
                  )}
                </div>
              </div>
              <div>
                <h3 style={{ marginTop: 0 }}>Anotações</h3>
                <textarea value={l.notes ?? ""} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Ex.: falei com a Ana, dona. Pediu pra chamar sexta." style={{ minHeight: 110 }} />
              </div>
            </div>
            {l.audit && (
              <div className="mt">
                <h3>Auditoria do site</h3>
                <AuditView audit={l.audit} />
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function AuditView({ audit }: { audit: SiteAudit }) {
  return (
    <div>
      <div className="row">
        <span className={`score ${scoreClass(audit.score)}`}>Nota {audit.score}/100</span>
        <span className="badge badge-site">Mobile: {audit.mobile.verdict}</span>
        {audit.mobile.responsiveFramework && <span className="badge badge-ok">{audit.mobile.responsiveFramework}</span>}
        {audit.tech.map((t) => (
          <span key={t} className="badge badge-site">
            {t}
          </span>
        ))}
        <a href={audit.finalUrl} target="_blank" rel="noreferrer" className="small">
          abrir site ↗
        </a>
      </div>
      {audit.issues.length === 0 && <div className="alert alert-ok">Nenhum problema encontrado na página inicial. Site bem cuidado — talvez não seja o melhor lead.</div>}
      {audit.issues.map((i, idx) => (
        <div key={idx} className={`issue ${i.severity}`}>
          <b>
            [{i.severity.toUpperCase()}] {i.title}
          </b>
          <p>{i.detail}</p>
          <p className="pitch">💬 Como falar: “{i.pitch}”</p>
        </div>
      ))}
      {audit.positives.length > 0 && <p className="small muted mt">Pontos positivos: {audit.positives.join(" · ")}</p>}
    </div>
  );
}
