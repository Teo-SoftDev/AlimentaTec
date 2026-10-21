import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import LineChart from "../components/LineChart.jsx";
import { Banner, Card, DemoBadge, KpiCard, PageHeader, btnOutline, btnPrimary, inputCls } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toDate, useCollection } from "../hooks/useCollection.js";
import { raiseSecurityAlert } from "../services/audit.js";
import { verifyAuditChain } from "../utils/auditChain.js";
import { EVENT_TYPES, PONDS, eventLabel } from "../utils/constants.js";
import { DEMO_AUDIT } from "../utils/demoData.js";
import { friendlyError } from "../utils/errors.js";
import { historyFilterSchema } from "../utils/validation.js";

const SEV = {
  info: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
  warning: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
  critical: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
};
const SEV_LABEL = { info: "Info", warning: "Advertencia", critical: "Crítico" };
const dayKey = (d) => d.toISOString().slice(0, 10);

export default function History() {
  const { actor, can, audit } = useAuth();
  const [params] = useSearchParams();
  const logs = useCollection("auditLogs", { orderByField: "ts", direction: "desc", limitN: 500, fallback: DEMO_AUDIT });
  const secAlerts = useCollection("securityAlerts", { orderByField: "ts", direction: "desc", limitN: 10, enabled: can("security:view") });

  const [filters, setFilters] = useState({ from: "", to: "", type: "all", pond: "", q: (params.get("q") || "").slice(0, 80) });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [integrity, setIntegrity] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => { setPage(1); }, [filters, pageSize]);

  // A03: los filtros se validan con allowlist antes de usarse.
  const parsed = historyFilterSchema.safeParse(filters);
  const f = parsed.success ? parsed.data : { from: "", to: "", type: "all", pond: "", q: "" };

  const rows = useMemo(() => {
    const from = f.from ? Date.parse(f.from + "T00:00:00") : null;
    const to = f.to ? Date.parse(f.to + "T23:59:59") : null;
    const q = f.q.toLowerCase();
    return logs.items
      .map((r) => ({ ...r, _date: toDate(r.ts) || (r.clientTs ? new Date(r.clientTs) : null) }))
      .filter((r) => {
        const t = r._date?.getTime();
        if (from && (!t || t < from)) return false;
        if (to && (!t || t > to)) return false;
        if (f.type !== "all" && r.type !== f.type) return false;
        if (f.pond && r.details?.pond !== f.pond && r.target !== f.pond) return false;
        if (q && !`${eventLabel(r.type)} ${r.target} ${r.email} ${Object.values(r.details || {}).join(" ")}`.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [logs.items, f.from, f.to, f.type, f.pond, f.q]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const view = rows.slice((page - 1) * pageSize, page * pageSize);

  // Curva de trazabilidad: kg dispensados por día (a partir de los eventos de dispensación).
  const trace = useMemo(() => {
    const by = {};
    rows.filter((r) => ["dispense_manual", "dispense_test"].includes(r.type) && r._date).forEach((r) => {
      const k = dayKey(r._date);
      by[k] = (by[k] || 0) + ((Number(r.details?.amountG) || 0) * (Number(r.details?.rations) || 1)) / 1000;
    });
    const keys = Object.keys(by).sort().slice(-14);
    if (keys.length >= 2) return { labels: keys.map((k) => k.slice(5)), values: keys.map((k) => +by[k].toFixed(2)), real: true };
    return { labels: Array.from({ length: 14 }, (_, i) => `D-${13 - i}`), values: Array.from({ length: 14 }, (_, i) => +(8 + i * 0.35 + Math.sin(i) * 0.8).toFixed(2)), real: false };
  }, [rows]);

  const critical = rows.filter((r) => r.severity === "critical").length;
  const dispenses = rows.filter((r) => ["dispense_manual", "dispense_test"].includes(r.type)).length;

  async function verify() {
    setVerifying(true); setNotice(null);
    try {
      const res = await verifyAuditChain(logs.items.filter((r) => !r._demo));
      setIntegrity(res);
      if (res.anomalies.length) {
        const first = res.anomalies[0];
        await raiseSecurityAlert({ actor: actor(), kind: "audit_tampering", detail: `${res.anomalies.length} anomalía(s) en el registro de auditoría (ej.: ${first.kind}, sesión ${first.sessionId.slice(0, 8)}, seq ${first.seq}).` });
        audit("integrity_check", "auditLogs", { resultado: "anomalias", total: res.anomalies.length }, "critical");
      } else {
        audit("integrity_check", "auditLogs", { resultado: "ok", verificados: res.checked });
      }
    } catch (e) {
      setNotice({ tone: "error", text: friendlyError(e) });
    } finally {
      setVerifying(false);
    }
  }

  const set = (k) => (e) => setFilters((s) => ({ ...s, [k]: e.target.value }));
  const clear = () => setFilters({ from: "", to: "", type: "all", pond: "", q: "" });

  return (
    <AppLayout active="historial" searchPlaceholder="Buscar en el historial…">
      <PageHeader
        eyebrow={<><span>Telemetría operativa › Auditoría y trazabilidad</span><DemoBadge show={logs.isDemo} /></>}
        title="Historial de Eventos y Trazabilidad"
        subtitle="Registro de solo lectura de acciones críticas: quién, cuándo y desde qué sesión."
        actions={<button className={btnPrimary} onClick={verify} disabled={verifying || logs.isDemo}><span className="material-symbols-outlined text-base" aria-hidden="true">verified</span>{verifying ? "Verificando…" : "Verificar integridad"}</button>}
      />
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      {logs.error && <Banner tone="warn">{logs.error}</Banner>}
      <Banner tone="info" icon="lock">Los registros son <strong>inmutables</strong>: ningún rol puede editarlos ni borrarlos desde la aplicación. Cualquier alteración se detecta con la verificación de integridad y genera una alerta para el administrador.</Banner>
      {integrity && (integrity.anomalies.length === 0
        ? <Banner tone="success">Integridad verificada: {integrity.checked} registro(s) sin anomalías.</Banner>
        : <Banner tone="error" icon="gpp_bad"><strong>{integrity.anomalies.length} anomalía(s) detectadas.</strong> Se notificó al administrador. {integrity.anomalies.slice(0, 3).map((a, i) => <span key={i} className="block text-xs">• {a.kind} — sesión {a.sessionId.slice(0, 8)}, seq {a.seq} {a.detail || ""}</span>)}</Banner>)}
      {can("security:view") && secAlerts.items.length > 0 && (
        <Banner tone="error" icon="gpp_maybe"><strong>Alertas de seguridad abiertas:</strong>{secAlerts.items.slice(0, 3).map((s) => <span key={s.id} className="block text-xs">• {s.kind}: {s.detail}</span>)}</Banner>
      )}

      <section aria-label="Resumen" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Eventos (filtro)" icon="event_note" value={rows.length} unit="registros" barPct={100} />
        <KpiCard label="Dispensaciones" icon="scale" value={dispenses} unit="eventos" barPct={Math.min(100, dispenses * 10)} barClass="bg-primary-container" />
        <KpiCard label="Eventos críticos" icon="shield" iconClass="text-error" value={critical} unit="eventos" valueClass={critical ? "text-error" : "text-on-surface"} barPct={Math.min(100, critical * 20)} barClass="bg-error" />
        <KpiCard label="Integridad" icon="verified" value={integrity ? (integrity.anomalies.length ? "Alterada" : "Íntegra") : "Sin verificar"} iconClass={integrity?.anomalies.length ? "text-error" : "text-primary"} valueClass="text-lg" />
      </section>

      <Card className="p-5" aria-labelledby="h-trace">
        <div className="flex justify-between flex-wrap gap-2 mb-2">
          <div><h2 id="h-trace" className="text-headline-sm font-headline-sm text-on-surface">Curva de trazabilidad: alimento dispensado por día</h2><p className="text-body-sm text-secondary">{trace.real ? "Calculada a partir de los eventos de dispensación registrados." : "Curva de referencia (aún no hay suficientes eventos de dispensación)."}</p></div>
        </div>
        <LineChart ariaLabel="Alimento dispensado por día en kilogramos" labels={trace.labels} yFormat={(v) => v.toFixed(1)} height={170} series={[{ name: "Dispensado", color: "#004349", values: trace.values, fmt: (v) => `${v.toFixed(2)} kg` }]} />
      </Card>

      <Card className="overflow-hidden" aria-labelledby="h-log">
        <div className="p-4 border-b border-surface-container space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 id="h-log" className="text-headline-sm font-headline-sm text-on-surface">Registro de eventos</h2>
            <button className="text-primary text-label-md font-semibold hover:underline" onClick={clear}>Limpiar filtros</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <label className="text-label-sm text-secondary">Desde<input type="date" className={inputCls} value={filters.from} onChange={set("from")} /></label>
            <label className="text-label-sm text-secondary">Hasta<input type="date" className={inputCls} value={filters.to} onChange={set("to")} /></label>
            <label className="text-label-sm text-secondary">Tipo de evento<select className={inputCls} value={filters.type} onChange={set("type")}><option value="all">Todos</option>{Object.entries(EVENT_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="text-label-sm text-secondary">Estanque<select className={inputCls} value={filters.pond} onChange={set("pond")}><option value="">Todos</option>{PONDS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="text-label-sm text-secondary col-span-2 lg:col-span-1">Texto<input maxLength={80} className={inputCls} placeholder="Operador, dispositivo…" value={filters.q} onChange={set("q")} /></label>
          </div>
          {!parsed.success && <p role="alert" className="text-label-sm text-error">Algún filtro no es válido y fue ignorado.</p>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">Registro de auditoría</caption>
            <thead><tr className="bg-surface-container-low text-secondary text-label-sm uppercase tracking-wider"><th className="py-3 px-4">Fecha y hora</th><th className="px-4">Evento</th><th className="px-4">Objetivo</th><th className="px-4">Detalle</th><th className="px-4">Operador</th><th className="px-4">Sesión</th><th className="px-4">Sello</th></tr></thead>
            <tbody className="divide-y divide-surface-container text-body-sm">
              {logs.loading && <tr><td colSpan={7} className="p-6 text-secondary">Cargando…</td></tr>}
              {!logs.loading && view.length === 0 && <tr><td colSpan={7} className="p-6 text-secondary">No hay eventos para los filtros seleccionados.</td></tr>}
              {view.map((r) => (
                <tr key={r.id} className={r.severity === "critical" ? "bg-red-50/30" : ""}>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-xs"><div>{r._date?.toLocaleDateString("es")}</div><div className="text-secondary">{r._date?.toLocaleTimeString("es", { hour12: false })}</div></td>
                  <td className="px-4"><span className={`inline-flex px-2 py-0.5 rounded border text-xs font-medium ${SEV[r.severity] || SEV.info}`} title={SEV_LABEL[r.severity]}>{eventLabel(r.type)}</span></td>
                  <td className="px-4 font-mono text-xs">{r.target || "—"}</td>
                  <td className="px-4 text-xs text-secondary max-w-[260px]">{Object.entries(r.details || {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}</td>
                  <td className="px-4 text-xs"><div className="font-medium break-all">{r.email}</div><div className="text-secondary">{r.role}</div></td>
                  <td className="px-4 font-mono text-xs">{String(r.sessionId || "").slice(0, 8)}{r.seq ? <span className="text-secondary"> #{r.seq}</span> : null}</td>
                  <td className="px-4 font-mono text-[10px] text-secondary" title={r.hash}>{r.hash ? r.hash.slice(0, 10) + "…" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-label-sm text-secondary">
          <div className="flex items-center gap-2">
            <span>{rows.length} resultado(s) · Filas por página:</span>
            <select aria-label="Filas por página" className="py-1 px-2 border border-outline-variant rounded bg-surface-container-low text-xs" value={pageSize} onChange={(e) => setPageSize(+e.target.value)}>{[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}</select>
          </div>
          <div className="flex items-center gap-1">
            <button className={btnOutline} disabled={page <= 1} onClick={() => setPage(1)} aria-label="Primera página"><span className="material-symbols-outlined text-base" aria-hidden="true">first_page</span></button>
            <button className={btnOutline} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior"><span className="material-symbols-outlined text-base" aria-hidden="true">chevron_left</span></button>
            <span className="px-3 font-semibold text-on-surface">Página {page} de {pages}</span>
            <button className={btnOutline} disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Página siguiente"><span className="material-symbols-outlined text-base" aria-hidden="true">chevron_right</span></button>
            <button className={btnOutline} disabled={page >= pages} onClick={() => setPage(pages)} aria-label="Última página"><span className="material-symbols-outlined text-base" aria-hidden="true">last_page</span></button>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
