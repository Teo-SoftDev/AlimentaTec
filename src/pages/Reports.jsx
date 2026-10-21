import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout.jsx";
import LineChart from "../components/LineChart.jsx";
import { Banner, Card, DemoBadge, Field, KpiCard, PageHeader, btnOutline, btnPrimary, inputCls } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCollection } from "../hooks/useCollection.js";
import { PONDS, pondName } from "../utils/constants.js";
import { downloadBlob, toCsv } from "../utils/csv.js";
import { buildProduction } from "../utils/demoData.js";
import { friendlyError } from "../utils/errors.js";
import { checkExportRate, formatRetry } from "../utils/rateLimiter.js";
import { REPORT_METRICS, reportFilterSchema, validate } from "../utils/validation.js";

const METRICS = {
  feed: { label: "Consumo total de alimento", unit: "kg", col: "Alimento (kg)", agg: "sum", dec: 1 },
  fcr: { label: "Conversión alimenticia (FCR)", unit: "", col: "FCR", agg: "avg", dec: 2 },
  growth: { label: "Crecimiento promedio", unit: "g/día", col: "Crecimiento (g/día)", agg: "avg", dec: 2 },
  incidents: { label: "Incidentes de dispositivos", unit: "", col: "Incidentes", agg: "sum", dec: 0 },
};
const KEY = { feed: "feedKg", fcr: "fcr", growth: "growthG", incidents: "incidents" };
const COLORS = ["#004349", "#D97706", "#545f73", "#20686f"];
const iso = (d) => d.toISOString().slice(0, 10);
const agg = (vals, kind) => (vals.length ? (kind === "sum" ? vals.reduce((a, b) => a + b, 0) : vals.reduce((a, b) => a + b, 0) / vals.length) : 0);

export default function Reports() {
  const { user, actor, can, audit } = useAuth();
  const today = new Date();
  const [form, setForm] = useState({ metrics: [...REPORT_METRICS], from: iso(new Date(today.getTime() - 29 * 864e5)), to: iso(today), ponds: PONDS.map((p) => p.id) });
  const [errors, setErrors] = useState({});
  const [applied, setApplied] = useState(null);
  const [tab, setTab] = useState("feed");
  const [notice, setNotice] = useState(null);
  const [exporting, setExporting] = useState("");
  const canExport = can("reports:export");

  const generate = (e) => {
    e?.preventDefault();
    setNotice(null);
    const v = validate(reportFilterSchema, form); // A03: allowlist de métricas/estanques + fechas válidas
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setApplied(v.data);
    if (!v.data.metrics.includes(tab)) setTab(v.data.metrics[0]);
  };
  useEffect(() => { generate(); /* informe inicial */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const demoRows = useMemo(() => (applied ? buildProduction({ from: applied.from, to: applied.to, ponds: applied.ponds }) : null), [applied]);
  const q = useCollection("productionMetrics", {
    enabled: !!applied,
    whereClauses: applied ? [["date", ">=", applied.from], ["date", "<=", applied.to]] : [],
    orderByField: "date", limitN: 5000, fallback: demoRows,
  });

  const rows = useMemo(() => (applied ? q.items.filter((r) => applied.ponds.includes(r.pondId)) : []), [q.items, applied]);
  const byPond = useMemo(() => {
    if (!applied) return [];
    return applied.ponds.map((id) => {
      const r = rows.filter((x) => x.pondId === id);
      return { id, name: pondName(id), feed: agg(r.map((x) => x.feedKg), "sum"), fcr: agg(r.map((x) => x.fcr), "avg"), growth: agg(r.map((x) => x.growthG), "avg"), incidents: agg(r.map((x) => x.incidents), "sum") };
    });
  }, [rows, applied]);

  const chart = useMemo(() => {
    if (!applied) return null;
    const dates = [...new Set(rows.map((r) => r.date))].sort();
    return {
      labels: dates.map((d) => d.slice(5)),
      series: applied.ponds.map((p, i) => ({ name: p, color: COLORS[i % COLORS.length], values: dates.map((d) => rows.find((r) => r.date === d && r.pondId === p)?.[KEY[tab]] ?? NaN), fmt: (v) => v.toFixed(METRICS[tab].dec) })),
    };
  }, [rows, applied, tab]);

  const totals = applied ? { feed: byPond.reduce((a, p) => a + p.feed, 0), fcr: agg(byPond.map((p) => p.fcr), "avg"), growth: agg(byPond.map((p) => p.growth), "avg"), incidents: byPond.reduce((a, p) => a + p.incidents, 0) } : null;

  const toggle = (key, val) => setForm((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));

  async function guard(format) {
    if (!applied) return false;
    if (!canExport) { setNotice({ tone: "error", text: "Su rol no tiene permiso para exportar datos de la granja." }); return false; }
    const rate = checkExportRate(user.uid);
    if (!rate.allowed) { setNotice({ tone: "error", text: `Demasiadas exportaciones seguidas. Reintente en ${formatRetry(rate.retryAfterMs)}.` }); return false; }
    setExporting(format); setNotice(null);
    return true;
  }
  const log = (format, count) => audit("report_export", format, { filas: count, metricas: applied.metrics.join(","), desde: applied.from, hasta: applied.to, estanques: applied.ponds.join(",") }, "warning");

  async function exportCsv() {
    if (!(await guard("csv"))) return;
    try {
      const headers = ["Fecha", "Estanque", ...applied.metrics.map((m) => METRICS[m].col)];
      const data = rows.map((r) => [r.date, r.pondId, ...applied.metrics.map((m) => r[KEY[m]])]);
      downloadBlob(`reporte_alimentatec_${applied.from}_${applied.to}.csv`, new Blob([toCsv(headers, data)], { type: "text/csv;charset=utf-8" }));
      log("csv", data.length);
      setNotice({ tone: "success", text: `CSV generado con ${data.length} filas.` });
    } catch (e) { setNotice({ tone: "error", text: friendlyError(e) }); } finally { setExporting(""); }
  }

  async function exportPdf() {
    if (!(await guard("pdf"))) return;
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]); // carga diferida (rendimiento)
      const autoTable = autoTableMod.default;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFontSize(16); doc.text("AlimentaTec — Reporte ejecutivo de producción", 40, 48);
      doc.setFontSize(9); doc.setTextColor(90);
      doc.text(`Periodo: ${applied.from} a ${applied.to}   ·   Estanques: ${applied.ponds.join(", ")}`, 40, 66);
      doc.text(`Generado por: ${user.email}   ·   ${new Date().toLocaleString("es")}`, 40, 79);
      const cols = applied.metrics;
      autoTable(doc, {
        startY: 96, head: [["Estanque", ...cols.map((m) => METRICS[m].col)]],
        body: byPond.map((p) => [p.name, ...cols.map((m) => p[m].toFixed(METRICS[m].dec))]),
        foot: [["Total / promedio", ...cols.map((m) => totals[m].toFixed(METRICS[m].dec))]],
        headStyles: { fillColor: [0, 67, 73] }, footStyles: { fillColor: [230, 232, 234], textColor: 20 }, styles: { fontSize: 9 },
      });
      const MAX = 400;
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 24, head: [["Fecha", "Estanque", ...cols.map((m) => METRICS[m].col)]],
        body: rows.slice(0, MAX).map((r) => [r.date, r.pondId, ...cols.map((m) => String(r[KEY[m]]))]),
        headStyles: { fillColor: [84, 95, 115] }, styles: { fontSize: 8 },
      });
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text(`Confidencial · Página ${i} de ${n}${rows.length > MAX ? ` · detalle limitado a ${MAX} filas` : ""}`, 40, 820); }
      doc.save(`reporte_alimentatec_${applied.from}_${applied.to}.pdf`);
      log("pdf", Math.min(rows.length, MAX));
      setNotice({ tone: "success", text: "PDF generado correctamente." });
    } catch (e) { setNotice({ tone: "error", text: friendlyError(e, "No se pudo generar el PDF.") }); } finally { setExporting(""); }
  }

  return (
    <AppLayout active="reportes" searchPlaceholder="Buscar en el historial…">
      <PageHeader
        eyebrow={<><span>Análisis · Reportes ejecutivos</span><DemoBadge show={q.isDemo} /></>}
        title="Reportes Ejecutivos de Producción"
        subtitle="Consumo de alimento, FCR, crecimiento por estanque e incidentes de dispositivos."
        actions={<>
          <button className={btnOutline} onClick={exportCsv} disabled={!applied || !canExport || !!exporting}><span className="material-symbols-outlined text-base" aria-hidden="true">csv</span>{exporting === "csv" ? "Generando…" : "Exportar CSV"}</button>
          <button className={btnPrimary} onClick={exportPdf} disabled={!applied || !canExport || !!exporting}><span className="material-symbols-outlined text-base" aria-hidden="true">picture_as_pdf</span>{exporting === "pdf" ? "Generando…" : "Exportar PDF"}</button>
        </>}
      />
      {!canExport && <Banner tone="info" icon="lock">Su rol (Operador) puede ver los reportes, pero la exportación de datos sensibles está reservada a Administradores y Auditores.</Banner>}
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      {q.error && <Banner tone="warn">{q.error}</Banner>}

      <Card className="p-5" aria-labelledby="h-filter">
        <form onSubmit={generate} noValidate className="space-y-4">
          <h2 id="h-filter" className="text-headline-sm font-headline-sm text-on-surface">Parámetros del informe</h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <fieldset className="lg:col-span-4"><legend className="text-sm font-semibold text-on-surface mb-2">Métricas</legend>
              <div className="space-y-2">{REPORT_METRICS.map((m) => <label key={m} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.metrics.includes(m)} onChange={() => toggle("metrics", m)} />{METRICS[m].label}</label>)}</div>
              {errors.metrics && <p role="alert" className="text-label-sm text-error mt-1">{errors.metrics}</p>}
            </fieldset>
            <fieldset className="lg:col-span-4"><legend className="text-sm font-semibold text-on-surface mb-2">Estanques</legend>
              <div className="space-y-2">{PONDS.map((p) => <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.ponds.includes(p.id)} onChange={() => toggle("ponds", p.id)} />{p.name} <span className="text-secondary">· {p.species}</span></label>)}</div>
              {errors.ponds && <p role="alert" className="text-label-sm text-error mt-1">{errors.ponds}</p>}
            </fieldset>
            <div className="lg:col-span-4 space-y-3">
              <Field label="Desde" htmlFor="r-from" error={errors.from}><input id="r-from" type="date" className={inputCls} value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} /></Field>
              <Field label="Hasta" htmlFor="r-to" error={errors.to}><input id="r-to" type="date" className={inputCls} value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} /></Field>
              <button type="submit" className={btnPrimary}><span className="material-symbols-outlined text-base" aria-hidden="true">analytics</span>Generar informe</button>
            </div>
          </div>
        </form>
      </Card>

      {applied && totals && (
        <>
          <section aria-label="Totales" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {applied.metrics.includes("feed") && <KpiCard label="Alimento total" icon="scale" value={totals.feed.toFixed(0)} unit="kg" barPct={100} />}
            {applied.metrics.includes("fcr") && <KpiCard label="FCR promedio" icon="trending_down" value={totals.fcr.toFixed(2)} barPct={Math.max(0, 100 - (totals.fcr - 1) * 100)} barClass="bg-primary-container" />}
            {applied.metrics.includes("growth") && <KpiCard label="Crecimiento promedio" icon="show_chart" value={totals.growth.toFixed(2)} unit="g/día" barPct={65} />}
            {applied.metrics.includes("incidents") && <KpiCard label="Incidentes" icon="warning" iconClass="text-amber-600" value={totals.incidents} valueClass={totals.incidents ? "text-amber-700" : "text-on-surface"} barPct={Math.min(100, totals.incidents * 10)} barClass="bg-amber-500" />}
          </section>

          <Card className="p-5" aria-labelledby="h-chart">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 id="h-chart" className="text-headline-sm font-headline-sm text-on-surface">Evolución diaria por estanque</h2>
              <div role="tablist" className="flex bg-surface-container p-1 rounded">{applied.metrics.map((m) => <button key={m} role="tab" aria-selected={tab === m} onClick={() => setTab(m)} className={`px-3 py-1.5 rounded text-label-md ${tab === m ? "bg-white text-primary font-semibold shadow-sm" : "text-secondary"}`}>{METRICS[m].col}</button>)}</div>
            </div>
            <LineChart ariaLabel={`Evolución diaria de ${METRICS[tab].label}`} labels={chart.labels} series={chart.series} area={false} yFormat={(v) => v.toFixed(METRICS[tab].dec)} height={240} />
            <div className="flex flex-wrap gap-4 mt-2 text-label-sm">{chart.series.map((s) => <span key={s.name} className="flex items-center gap-1.5"><span className="w-3 h-1 rounded" style={{ background: s.color }}></span>{s.name}</span>)}</div>
          </Card>

          <Card className="overflow-hidden" aria-labelledby="h-sum">
            <h2 id="h-sum" className="px-5 py-4 border-b border-surface-container text-headline-sm font-headline-sm text-on-surface">Resumen por estanque</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <thead><tr className="bg-surface-container-low text-secondary text-label-sm uppercase tracking-wider"><th className="py-3 px-5">Estanque</th>{applied.metrics.map((m) => <th key={m} className="px-4 text-right">{METRICS[m].col}</th>)}</tr></thead>
                <tbody className="divide-y divide-surface-container">
                  {byPond.map((p) => <tr key={p.id}><td className="py-3 px-5 font-semibold text-primary">{p.name}</td>{applied.metrics.map((m) => <td key={m} className="px-4 text-right font-mono">{p[m].toFixed(METRICS[m].dec)}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-label-sm text-secondary border-t border-surface-container">{rows.length} registros diarios en el periodo. Cada exportación queda registrada en la auditoría.</p>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
