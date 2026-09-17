"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";
import type { Lead, SearchResponse, SiteAudit } from "@/lib/types";
import { prettyPhone } from "@/lib/phone";
import { DEFAULT_FUNNEL, PLACEHOLDERS, renderTemplate, type FunnelStage } from "@/lib/funnel";

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
  funnel: FunnelStage[];
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
  funnel: DEFAULT_FUNNEL,
};

const LS_CONFIG = "prospectlife.config.v2";
const LS_LEADS = "prospectlife.leads.v2";

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
  const [open, setOpen] = useState<string | null>(null);
  const [showFunnelEditor, setShowFunnelEditor] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Carrega/salva tudo no navegador (nada vai para o servidor)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CONFIG);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Config>;
        setCfg({ ...DEFAULT_CONFIG, ...saved, funnel: saved.funnel?.length ? saved.funnel : DEFAULT_FUNNEL });
      }
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
  const updateLead = useCallback((id: string, patch: Partial<LeadRow>) => {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

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

  const funnel = cfg.funnel;
  const me = { name: cfg.senderName, business: cfg.senderBusiness };

  const setStage = (i: number, patch: Partial<FunnelStage>) =>
    set(
      "funnel",
      funnel.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    );
  const addStage = () => set("funnel", [...funnel, { id: "etapa_" + Date.now(), name: `${funnel.length + 1}. Nova etapa`, text: "" }]);
  const removeStage = (i: number) => {
    if (funnel.length <= 1) return;
    if (!confirm(`Remover a etapa "${funnel[i].name}"? Leads nessa etapa voltam para a anterior.`)) return;
    set(
      "funnel",
      funnel.filter((_, idx) => idx !== i)
    );
    setLeads((ls) => ls.map((l) => ((l.stage ?? 0) >= i && (l.stage ?? 0) > 0 ? { ...l, stage: (l.stage ?? 0) - 1 } : l)));
  };
  const moveStage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= funnel.length) return;
    const arr = [...funnel];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set("funnel", arr);
  };
  const resetFunnel = () => {
    if (confirm("Voltar o funil para os textos sugeridos? Suas edições serão perdidas.")) set("funnel", DEFAULT_FUNNEL);
  };

  const advance = (l: LeadRow) => {
    const next = Math.min((l.stage ?? 0) + 1, funnel.length - 1);
    updateLead(l.id, { stage: next, lastContact: new Date().toISOString() });
  };

  /* ---------------- Exportar / limpar ---------------- */

  const exportCsv = () => {
    const header = ["Empresa", "Telefone", "WhatsApp", "Instagram", "Situação do site", "Site", "Nota do site", "Mobile", "Cidade", "Nicho", "Endereço", "Avaliação", "Etapa do funil", "Status", "Último contato", "Anotações", "Fonte", "Google Maps"];
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
      funnel[l.stage ?? 0]?.name ?? "",
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
    return v;
  }, [leads, tab, stageFilter]);

  const counts = useMemo(
    () => ({
      todos: leads.length,
      none: leads.filter((l) => l.siteType === "none").length,
      social: leads.filter((l) => l.siteType === "social").length,
      site: leads.filter((l) => l.siteType === "site").length,
      wa: leads.filter((l) => l.whatsapp).length,
      ig: leads.filter((l) => l.instagram).length,
      ganhos: leads.filter((l) => l.status === "ganho").length,
    }),
    [leads]
  );
  const stageCounts = useMemo(() => funnel.map((_, i) => leads.filter((l) => (l.stage ?? 0) === i && l.status !== "perdido").length), [funnel, leads]);

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
          Você escreve os textos de cada etapa uma vez. Depois, em cada lead, o botão <b>Abrir WhatsApp</b> já leva o texto da etapa em que ele está,
          com o nome da empresa e da cidade preenchidos. Os textos abaixo são só uma sugestão — mude tudo do seu jeito.
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
            {showFunnelEditor ? "Fechar editor" : "✏️ Editar textos do funil"}
          </button>
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
            <p className="hint">
              Variáveis que você pode usar nos textos (são trocadas automaticamente):{" "}
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
                      {renderTemplate(
                        s.text,
                        { name: "Pizzaria do Zé", city: "Curitiba", niche: "Pizzaria" } as Lead,
                        me
                      ) || "—"}
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
                <span>com WhatsApp</span>
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
            {stageFilter !== "all" && (
              <button className="btn btn-secondary btn-sm" onClick={() => setStageFilter("all")}>
                ✕ Filtro: {funnel[stageFilter]?.name}
              </button>
            )}
          </div>

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
                    funnel={funnel}
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
  const waLink = l.whatsapp ? (text ? `${l.whatsapp}?text=${encodeURIComponent(text)}` : l.whatsapp) : null;
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
          {l.phoneE164 ? <span>{prettyPhone(l.phoneE164)}</span> : <span className="muted">{l.phoneRaw ? `sem WhatsApp (${l.phoneRaw})` : "não informado"}</span>}
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
