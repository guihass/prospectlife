"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";
import type { Lead, SearchResponse, SiteAudit } from "@/lib/types";
import type { SenderConfig, SenderProvider } from "@/lib/sender";
import { prettyPhone } from "@/lib/phone";

/* ------------------------------------------------------------------ */
/* Tipos locais                                                        */
/* ------------------------------------------------------------------ */

type SendStatus = "pendente" | "enviando" | "enviado" | "erro";

interface LeadRow extends Lead {
  message?: string;
  followUp?: string;
  messageSource?: "ia" | "modelo";
  sendStatus?: SendStatus;
  sendError?: string;
  selected?: boolean;
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
  anthropicKey: string;
  provider: SenderProvider;
  cloudToken: string;
  cloudPhoneNumberId: string;
  cloudTemplateName: string;
  cloudTemplateLang: string;
  evoBaseUrl: string;
  evoApiKey: string;
  evoInstance: string;
  minDelay: number;
  maxDelay: number;
  dailyCap: number;
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
  anthropicKey: "",
  provider: "evolution",
  cloudToken: "",
  cloudPhoneNumberId: "",
  cloudTemplateName: "",
  cloudTemplateLang: "pt_BR",
  evoBaseUrl: "",
  evoApiKey: "",
  evoInstance: "",
  minDelay: 60,
  maxDelay: 180,
  dailyCap: 40,
  testNumber: "",
};

const LS_CONFIG = "prospectlife.config.v1";
const LS_LEADS = "prospectlife.leads.v1";
const LS_DAILY = "prospectlife.daily.v1";

type Tab = "todos" | "none" | "social" | "site";

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function splitList(s: string, allowComma = true): string[] {
  return s
    .split(allowComma ? /[\n,;]+/ : /[\n;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

function rand(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
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
function getDailyCount(): number {
  try {
    const raw = localStorage.getItem(LS_DAILY);
    if (!raw) return 0;
    const { day, count } = JSON.parse(raw) as { day: string; count: number };
    return day === todayKey() ? count : 0;
  } catch {
    return 0;
  }
}
function bumpDaily(): number {
  const n = getDailyCount() + 1;
  try {
    localStorage.setItem(LS_DAILY, JSON.stringify({ day: todayKey(), count: n }));
  } catch {}
  return n;
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function scoreClass(score: number): string {
  return score < 40 ? "score-bad" : score < 70 ? "score-mid" : "score-good";
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
  const [open, setOpen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendLog, setSendLog] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showSender, setShowSender] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sendAbortRef = useRef<AbortController | null>(null);

  // Carrega/salva configuração no navegador (nada vai para o servidor)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CONFIG);
      if (raw) setCfg({ ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<Config>) });
      const rawLeads = localStorage.getItem(LS_LEADS);
      if (rawLeads) setLeads(JSON.parse(rawLeads) as LeadRow[]);
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
  const addSendLog = useCallback((s: string) => setSendLog((l) => [...l.slice(-200), `${new Date().toLocaleTimeString()} ${s}`]), []);

  const updateLead = useCallback((id: string, patch: Partial<LeadRow>) => {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const senderConfig: SenderConfig = useMemo(
    () => ({
      provider: cfg.provider,
      cloudToken: cfg.cloudToken,
      cloudPhoneNumberId: cfg.cloudPhoneNumberId,
      cloudTemplateName: cfg.cloudTemplateName,
      cloudTemplateLang: cfg.cloudTemplateLang,
      evoBaseUrl: cfg.evoBaseUrl,
      evoApiKey: cfg.evoApiKey,
      evoInstance: cfg.evoInstance,
    }),
    [cfg]
  );
  const senderReady =
    cfg.provider === "cloud" ? !!(cfg.cloudToken && cfg.cloudPhoneNumberId) : !!(cfg.evoBaseUrl && cfg.evoApiKey && cfg.evoInstance);

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
    const existingKeys = new Set(leads.map((l) => (l.phoneE164 || l.name.toLowerCase() + "|" + l.city.toLowerCase())));
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
            found.push({ ...l, selected: true });
            added++;
          }
          addLog(`  ✓ ${data.totalFound} encontradas, ${added} novas sem site${cfg.includeWithSite ? "/com site" : ""}`);
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

    // Instagram
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

    // Auditoria
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

  /* ---------------- Mensagens ---------------- */

  const generateMessage = async (l: LeadRow): Promise<string | null> => {
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: l, senderName: cfg.senderName, senderBusiness: cfg.senderBusiness, anthropicKey: cfg.anthropicKey }),
      });
      const data = (await res.json()) as { text?: string; followUp?: string; source?: "ia" | "modelo"; warning?: string; error?: string };
      if (data.warning) addLog(data.warning);
      if (!data.text) return null;
      updateLead(l.id, { message: data.text, followUp: data.followUp, messageSource: data.source });
      return data.text;
    } catch {
      return null;
    }
  };

  const generateAll = async () => {
    const need = visible.filter((l) => !l.message);
    setProgress({ done: 0, total: need.length, label: "Escrevendo mensagens…" });
    let done = 0;
    await pool(need, cfg.anthropicKey ? 2 : 6, async (l) => {
      await generateMessage(l);
      done++;
      setProgress({ done, total: need.length, label: "Escrevendo mensagens…" });
    });
  };

  /* ---------------- Envio automático ---------------- */

  const runAutoSend = async () => {
    if (!senderReady) {
      setShowSender(true);
      return;
    }
    if (!cfg.senderName.trim()) {
      setError("Preencha seu nome (é usado nas mensagens) antes de enviar.");
      return;
    }
    const queue = visible.filter((l) => l.selected && l.whatsapp && l.sendStatus !== "enviado");
    if (!queue.length) {
      setError("Nenhum lead selecionado com WhatsApp para enviar.");
      return;
    }
    const ctrl = new AbortController();
    sendAbortRef.current = ctrl;
    setSending(true);
    setSendLog([]);
    addSendLog(`Fila: ${queue.length} mensagens. Pausa de ${cfg.minDelay}–${cfg.maxDelay}s entre cada uma. Mantenha esta aba aberta.`);

    for (const l of queue) {
      if (ctrl.signal.aborted) break;
      const daily = getDailyCount();
      if (daily >= cfg.dailyCap) {
        addSendLog(`Limite diário de ${cfg.dailyCap} mensagens atingido. Parando por hoje.`);
        break;
      }
      updateLead(l.id, { sendStatus: "enviando" });
      let text = l.message;
      if (!text) text = (await generateMessage(l)) ?? undefined;
      if (!text) {
        updateLead(l.id, { sendStatus: "erro", sendError: "Não consegui gerar a mensagem" });
        continue;
      }
      try {
        const res = await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: senderConfig, to: l.phoneE164, text, templateParams: [l.name] }),
          signal: ctrl.signal,
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (data.ok) {
          const n = bumpDaily();
          updateLead(l.id, { sendStatus: "enviado", sendError: undefined });
          addSendLog(`✓ ${l.name} (${prettyPhone(l.phoneE164)}) — ${n}/${cfg.dailyCap} hoje`);
        } else {
          updateLead(l.id, { sendStatus: "erro", sendError: data.error });
          addSendLog(`✗ ${l.name}: ${data.error}`);
        }
      } catch (e) {
        if (ctrl.signal.aborted) break;
        updateLead(l.id, { sendStatus: "erro", sendError: e instanceof Error ? e.message : "erro" });
      }
      const wait = rand(cfg.minDelay, cfg.maxDelay);
      addSendLog(`  aguardando ${wait}s…`);
      await sleep(wait * 1000, ctrl.signal);
    }
    addSendLog(ctrl.signal.aborted ? "Envio interrompido." : "Fila concluída.");
    setSending(false);
    sendAbortRef.current = null;
  };

  const stopSend = () => sendAbortRef.current?.abort();

  const sendTest = async () => {
    setTestResult(null);
    const to = cfg.testNumber.replace(/\D/g, "");
    if (!to) {
      setTestResult("Informe seu número com DDI (ex.: 5541999999999).");
      return;
    }
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: senderConfig, to, text: `Teste do ProspectLife ✅ (${new Date().toLocaleTimeString()})`, templateParams: ["Teste"] }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setTestResult(data.ok ? "Mensagem de teste enviada! Confira seu WhatsApp." : `Falhou: ${data.error}`);
  };

  /* ---------------- Exportar / limpar ---------------- */

  const exportCsv = () => {
    const header = ["Empresa", "Telefone", "WhatsApp", "Instagram", "Situação do site", "Site", "Nota do site", "Mobile", "Cidade", "Nicho", "Endereço", "Avaliação", "Mensagem", "Status envio", "Fonte", "Google Maps"];
    const rows = visible.map((l) => [
      l.name,
      prettyPhone(l.phoneE164),
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
      l.message ?? "",
      l.sendStatus ?? "",
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

  const visible = useMemo(() => (tab === "todos" ? leads : leads.filter((l) => l.siteType === tab)), [leads, tab]);
  const counts = useMemo(
    () => ({
      todos: leads.length,
      none: leads.filter((l) => l.siteType === "none").length,
      social: leads.filter((l) => l.siteType === "social").length,
      site: leads.filter((l) => l.siteType === "site").length,
      wa: leads.filter((l) => l.whatsapp).length,
      ig: leads.filter((l) => l.instagram).length,
      sent: leads.filter((l) => l.sendStatus === "enviado").length,
    }),
    [leads]
  );
  const selectedCount = visible.filter((l) => l.selected && l.whatsapp && l.sendStatus !== "enviado").length;

  const toggleAll = (v: boolean) => setLeads((ls) => ls.map((l) => (visible.some((x) => x.id === l.id) ? { ...l, selected: v } : l)));

  /* ------------------------------------------------------------------ */

  return (
    <>
      <section className="hero">
        <h1>
          Encontre empresas <span>sem site</span> e comece a conversa
        </h1>
        <p>
          Escolha o país, as cidades e o nicho. O ProspectLife entrega <b>nome, WhatsApp e Instagram</b>, audita sites fracos
          e escreve uma abordagem curta e humana. Grátis, para você e para quem mais quiser usar.{" "}
          <Link href="/como-usar">Primeira vez? Leia o guia →</Link>
        </p>
      </section>

      {/* ---------------- Formulário de busca ---------------- */}
      <section className="card">
        <h2>1. O que você quer prospectar?</h2>
        <p className="hint">Pode colocar várias cidades (uma por linha) e vários nichos (um por linha ou separados por vírgula). O app busca todas as combinações.</p>
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
              <small className="muted">Usa sua chave da Google Places — mais completo (telefone e site de quase todas).</small>
            </span>
          </label>
        </div>
        {cfg.mode === "google" && (
          <div className="field mt">
            <label>Sua chave da Google Places API</label>
            <input type="password" placeholder="AIza..." value={cfg.googleKey} onChange={(e) => set("googleKey", e.target.value)} autoComplete="off" />
            <small>
              A chave fica salva só no seu navegador. O Google dá US$ 200/mês grátis (dá para ~5.000 buscas). <Link href="/como-usar#google">Passo a passo para criar a chave →</Link>
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

      {/* ---------------- Abordagem ---------------- */}
      <section className="card">
        <h2>2. Quem está falando (para as mensagens)</h2>
        <p className="hint">O agente escreve a primeira mensagem curta, calma e sem pressão — como uma pessoa real. Esses dados entram no texto.</p>
        <div className="grid">
          <div className="field">
            <label>Seu nome</label>
            <input type="text" placeholder="Guilherme" value={cfg.senderName} onChange={(e) => set("senderName", e.target.value)} />
          </div>
          <div className="field">
            <label>Sua empresa (opcional)</label>
            <input type="text" placeholder="Life Web" value={cfg.senderBusiness} onChange={(e) => set("senderBusiness", e.target.value)} />
          </div>
          <div className="field">
            <label>Chave da Anthropic (opcional — IA escreve mensagens únicas)</label>
            <input type="password" placeholder="sk-ant-... (sem isso, usa modelos humanizados grátis)" value={cfg.anthropicKey} onChange={(e) => set("anthropicKey", e.target.value)} autoComplete="off" />
            <small>
              Sem chave o app já gera mensagens boas e variadas. Com chave, o Claude personaliza cada uma. <Link href="/como-usar#ia">Como conseguir →</Link>
            </small>
          </div>
        </div>

        <h3>Envio automático pelo seu número (opcional)</h3>
        <p className="hint">
          Sem configurar nada, você clica em <b>“Abrir WhatsApp”</b> em cada lead e a mensagem já vai pronta — só apertar enviar. Se quiser que o agente envie sozinho,
          conecte seu número abaixo.{" "}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowSender((v) => !v)}>
            {showSender ? "Ocultar configuração" : senderReady ? "✓ Número conectado — editar" : "Conectar meu número"}
          </button>
        </p>
        {showSender && (
          <div className="card" style={{ marginTop: 8 }}>
            <div className="radio-row">
              <label className={cfg.provider === "evolution" ? "active" : ""}>
                <input type="radio" name="prov" checked={cfg.provider === "evolution"} onChange={() => set("provider", "evolution")} />
                <span>
                  <b>Evolution API</b> (seu número normal, via QR Code)
                  <br />
                  <small className="muted">Grátis e open-source. Precisa rodar num servidor seu (VPS ou Docker).</small>
                </span>
              </label>
              <label className={cfg.provider === "cloud" ? "active" : ""}>
                <input type="radio" name="prov" checked={cfg.provider === "cloud"} onChange={() => set("provider", "cloud")} />
                <span>
                  <b>WhatsApp Cloud API</b> (Meta, oficial)
                  <br />
                  <small className="muted">Exige template aprovado para primeira mensagem. 1.000 conversas/mês grátis.</small>
                </span>
              </label>
            </div>
            {cfg.provider === "evolution" ? (
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
                  <label>Token permanente</label>
                  <input type="password" value={cfg.cloudToken} onChange={(e) => set("cloudToken", e.target.value)} autoComplete="off" />
                </div>
                <div className="field">
                  <label>Phone Number ID</label>
                  <input type="text" value={cfg.cloudPhoneNumberId} onChange={(e) => set("cloudPhoneNumberId", e.target.value)} />
                </div>
                <div className="field">
                  <label>Nome do template aprovado</label>
                  <input type="text" placeholder="abertura_prospectlife" value={cfg.cloudTemplateName} onChange={(e) => set("cloudTemplateName", e.target.value)} />
                  <small>Template com {"{{1}}"} = nome da empresa. Sem template, a Meta só permite responder quem te escreveu.</small>
                </div>
                <div className="field">
                  <label>Idioma do template</label>
                  <input type="text" value={cfg.cloudTemplateLang} onChange={(e) => set("cloudTemplateLang", e.target.value)} />
                </div>
              </div>
            )}
            <h3>Ritmo humano</h3>
            <div className="grid">
              <div className="field">
                <label>Pausa mínima entre mensagens (segundos)</label>
                <input type="number" min={20} value={cfg.minDelay} onChange={(e) => set("minDelay", Math.max(20, Number(e.target.value) || 20))} />
              </div>
              <div className="field">
                <label>Pausa máxima (segundos)</label>
                <input type="number" min={30} value={cfg.maxDelay} onChange={(e) => set("maxDelay", Math.max(cfg.minDelay, Number(e.target.value) || 60))} />
              </div>
              <div className="field">
                <label>Máximo por dia</label>
                <input type="number" min={1} max={200} value={cfg.dailyCap} onChange={(e) => set("dailyCap", Math.min(200, Math.max(1, Number(e.target.value) || 1)))} />
                <small>Número novo: comece com 20–30/dia e aumente aos poucos. Hoje: {loaded ? getDailyCount() : 0} enviadas.</small>
              </div>
            </div>
            <div className="row mt">
              <input type="text" placeholder="Seu número para teste (5541999999999)" value={cfg.testNumber} onChange={(e) => set("testNumber", e.target.value)} style={{ maxWidth: 320 }} />
              <button className="btn btn-secondary btn-sm" onClick={sendTest} disabled={!senderReady}>
                Enviar teste para mim
              </button>
              {testResult && <span className="small">{testResult}</span>}
            </div>
            <p className="hint mt">
              <Link href="/como-usar#envio">Guia completo: como conectar Evolution API ou Cloud API →</Link>
            </p>
          </div>
        )}
      </section>

      {/* ---------------- Resultados ---------------- */}
      {leads.length > 0 && (
        <section className="card">
          <h2>3. Leads encontrados</h2>
          <div className="stats">
            <div className="stat">
              <b>{counts.todos}</b>
              <span>empresas</span>
            </div>
            <div className="stat">
              <b>{counts.none + counts.social}</b>
              <span>sem site</span>
            </div>
            <div className="stat">
              <b>{counts.wa}</b>
              <span>com WhatsApp</span>
            </div>
            <div className="stat">
              <b>{counts.ig}</b>
              <span>com Instagram</span>
            </div>
            <div className="stat">
              <b>{counts.sent}</b>
              <span>mensagens enviadas</span>
            </div>
          </div>

          <div className="tabs">
            {(
              [
                ["todos", `Todos (${counts.todos})`],
                ["none", `Sem site nenhum (${counts.none})`],
                ["social", `Só Instagram/Facebook (${counts.social})`],
                ["site", `Com site — auditados (${counts.site})`],
              ] as [Tab, string][]
            ).map(([k, label]) => (
              <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </div>

          <div className="actions">
            <button className="btn btn-secondary" onClick={generateAll} disabled={running}>
              ✍️ Escrever mensagens para todos ({visible.filter((l) => !l.message).length} faltando)
            </button>
            {!sending ? (
              <button className="btn btn-primary" onClick={runAutoSend} disabled={running || selectedCount === 0}>
                🤖 Enviar automaticamente ({selectedCount} selecionados)
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopSend}>
                ■ Parar envio
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => toggleAll(true)}>
              Selecionar todos
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => toggleAll(false)}>
              Desmarcar todos
            </button>
          </div>
          {!senderReady && (
            <div className="alert alert-info">
              Envio automático desligado: conecte seu número na seção 2 ou use o botão <b>Abrir WhatsApp</b> em cada lead (mensagem já vai pronta).
            </div>
          )}
          {sendLog.length > 0 && (
            <div className="log">
              {sendLog.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Empresa</th>
                  <th>WhatsApp</th>
                  <th>Instagram</th>
                  <th>Site</th>
                  <th>Mensagem</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <LeadRowView
                    key={l.id}
                    lead={l}
                    open={open === l.id}
                    onToggle={() => setOpen(open === l.id ? null : l.id)}
                    onSelect={(v) => updateLead(l.id, { selected: v })}
                    onGenerate={() => generateMessage(l)}
                    onEditMessage={(m) => updateLead(l.id, { message: m })}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint mt">
            Os leads ficam salvos no seu navegador. Exporte em CSV para abrir no Excel/Google Sheets. Respeite quem pedir para não receber mais mensagens.
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
  open,
  onToggle,
  onSelect,
  onGenerate,
  onEditMessage,
}: {
  lead: LeadRow;
  open: boolean;
  onToggle: () => void;
  onSelect: (v: boolean) => void;
  onGenerate: () => Promise<string | null>;
  onEditMessage: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const waLink = l.whatsapp && l.message ? `${l.whatsapp}?text=${encodeURIComponent(l.message)}` : l.whatsapp;

  const gen = async () => {
    setBusy(true);
    await onGenerate();
    setBusy(false);
  };

  return (
    <>
      <tr>
        <td>
          <input type="checkbox" checked={!!l.selected} onChange={(e) => onSelect(e.target.checked)} disabled={!l.whatsapp} title={l.whatsapp ? "Incluir no envio automático" : "Sem WhatsApp"} />
        </td>
        <td>
          <b>{l.name}</b>
          <span className="sub">
            {l.niche} · {l.city}
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
              <span>{prettyPhone(l.phoneE164)}</span>
              {l.sendStatus && (
                <span className={`badge ${l.sendStatus === "enviado" ? "badge-sent" : l.sendStatus === "erro" ? "badge-none" : "badge-site"}`} style={{ marginLeft: 6 }} title={l.sendError}>
                  {l.sendStatus}
                </span>
              )}
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
                <div className="mt" style={{ marginTop: 4 }}>
                  <span className={`score ${scoreClass(l.audit.score)}`}>{l.audit.score}/100</span>
                  <span className="sub">mobile: {l.audit.mobile.verdict}</span>
                  <span className="sub">{l.audit.issues.length} problemas</span>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={onToggle}>
                    {open ? "Fechar" : "Ver auditoria"}
                  </button>
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
        <td style={{ minWidth: 260 }}>
          {l.message ? (
            <textarea value={l.message} onChange={(e) => onEditMessage(e.target.value)} style={{ minHeight: 90, fontSize: "0.88rem" }} />
          ) : (
            <span className="muted small">ainda não escrita</span>
          )}
          {l.messageSource && <span className="sub">{l.messageSource === "ia" ? "escrita pela IA" : "modelo humanizado"} — pode editar</span>}
        </td>
        <td>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={gen} disabled={busy}>
              {busy ? "…" : l.message ? "↻ Reescrever" : "✍️ Escrever"}
            </button>
            {waLink && (
              <a className="btn btn-wa btn-sm" href={waLink} target="_blank" rel="noreferrer">
                💬 Abrir WhatsApp
              </a>
            )}
            {l.instagramUrl && (
              <a className="btn btn-ig btn-sm" href={l.instagramUrl} target="_blank" rel="noreferrer">
                📸 Instagram
              </a>
            )}
          </div>
        </td>
      </tr>
      {open && l.audit && (
        <tr>
          <td colSpan={7}>
            <AuditView audit={l.audit} />
            {l.followUp && (
              <details className="mt">
                <summary>Sugestão de 2ª mensagem (se responderem)</summary>
                <div className="msg-box mt">{l.followUp}</div>
              </details>
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
      {audit.positives.length > 0 && (
        <p className="small muted mt">
          Pontos positivos: {audit.positives.join(" · ")}
        </p>
      )}
    </div>
  );
}
