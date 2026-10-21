import React, { useMemo, useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import AppLayout from "../components/AppLayout.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import LineChart from "../components/LineChart.jsx";
import NumberStepper from "../components/NumberStepper.jsx";
import ToggleSwitch from "../components/ToggleSwitch.jsx";
import { Banner, Card, DemoBadge, Field, PageHeader, btnOutline, btnPrimary, inputCls } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCollection } from "../hooks/useCollection.js";
import { writeAudit } from "../services/audit.js";
import { DEMO_BATCHES } from "../utils/demoData.js";
import { friendlyError } from "../utils/errors.js";
import { checkWriteRate, formatRetry } from "../utils/rateLimiter.js";
import { BATCH_STAGES, FEED_TYPES, batchSchema, validate } from "../utils/validation.js";
import { PONDS, pondName } from "../utils/constants.js";

const STAGE_LABELS = { alevinaje: "Alevinaje", crecimiento: "Crecimiento", engorde: "Engorde", adulto: "Adulto / mantenimiento" };
const FEED_LABELS = { pellet: "Pellet flotante 4 mm", biomasa: "Biomasa húmeda controlada", micro: "Gránulo micro-extruido 1,2 mm", gránulo: "Gránulo estándar" };

// Tasa base (% de biomasa/día) por peso medio y corrección por temperatura del agua.
const baseRate = (g) => (g < 5 ? 6 : g < 20 ? 4 : g < 100 ? 2.8 : g < 300 ? 2 : 1.4);
const tempFactor = (t) => (t < 10 ? 0.6 : t < 14 ? 0.8 : t <= 18 ? 1 : t <= 22 ? 1.1 : 0.7);

const BLANK = { code: "", name: "", species: "", pondId: "AQ-04", stage: "crecimiento", population: 1000, avgWeightG: 100, waterTempC: 15, feedType: "pellet", autoFeeding: true, quarantine: false, notes: "" };

export default function Animals() {
  const { actor, can } = useAuth();
  const { items, isDemo, error } = useCollection("batches", { orderByField: "code", limitN: 200, fallback: DEMO_BATCHES });
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const canWrite = can("animals:write");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const calc = useMemo(() => {
    const pop = Number.isFinite(form.population) ? form.population : 0;
    const w = Number.isFinite(form.avgWeightG) ? form.avgWeightG : 0;
    const t = Number.isFinite(form.waterTempC) ? form.waterTempC : 15;
    const biomassKg = (pop * w) / 1000;
    const rate = baseRate(w) * tempFactor(t);
    const dailyKg = (biomassKg * rate) / 100;
    const doses = w < 20 ? 8 : w < 100 ? 6 : 4;
    const sgr = 1.4 * tempFactor(t) * (w < 100 ? 1.3 : w < 500 ? 1 : 0.7); // %/día (modelo simplificado)
    const weeks = Array.from({ length: 13 }, (_, i) => i);
    return { biomassKg, rate, dailyKg, doses, perDose: dailyKg / doses, sgr, weeks, curve: weeks.map((i) => w * Math.exp((sgr / 100) * 7 * i)) };
  }, [form.population, form.avgWeightG, form.waterTempC]);

  async function save(e) {
    e.preventDefault();
    setNotice(null); setErrors({});
    if (!canWrite) return setNotice({ tone: "error", text: "Su rol no permite modificar lotes." });
    const v = validate(batchSchema, form);
    if (!v.ok) return setErrors(v.errors);
    const a = actor();
    const rate = checkWriteRate(a.uid);
    if (!rate.allowed) return setNotice({ tone: "error", text: `Demasiadas operaciones seguidas. Reintente en ${formatRetry(rate.retryAfterMs)}.` });
    setBusy(true);
    try {
      await setDoc(doc(db, "batches", v.data.code), { ...v.data, updatedBy: a.uid, updatedAt: serverTimestamp() });
      writeAudit({ actor: a, type: "batch_save", target: v.data.code, details: { pond: v.data.pondId, poblacion: v.data.population, pesoG: v.data.avgWeightG } });
      setNotice({ tone: "success", text: `Lote ${v.data.code} guardado correctamente.` });
    } catch (err) {
      setNotice({ tone: "error", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteDoc(doc(db, "batches", toDelete.id));
      writeAudit({ actor: actor(), type: "batch_delete", target: toDelete.code, severity: "warning", details: { pond: toDelete.pondId } });
      setNotice({ tone: "success", text: `Lote ${toDelete.code} eliminado.` });
    } catch (err) {
      setNotice({ tone: "error", text: friendlyError(err) });
    } finally {
      setBusy(false);
      setToDelete(null);
    }
  }

  const load = (b) => { setForm({ ...BLANK, ...b }); setErrors({}); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <AppLayout active="animales" searchPlaceholder="Buscar en el historial…">
      <PageHeader
        eyebrow={<><span>Bio-Gestión › Lotes de peces</span><DemoBadge show={isDemo} /></>}
        title="Registro y Ficha Nutricional de Lotes"
        subtitle="Población, biomasa y etapa de crecimiento con cálculo automático de la tasa de alimentación."
      />
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      {error && <Banner tone="warn">{error}</Banner>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-6 space-y-5" aria-labelledby="h-form">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
            <h2 id="h-form" className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary" aria-hidden="true">edit_note</span>Formulario de lote</h2>
            {!canWrite && <span className="text-label-sm font-label-sm text-secondary">Solo lectura</span>}
          </div>
          <form onSubmit={save} className="space-y-5" noValidate>
            <fieldset disabled={!canWrite || busy} className="space-y-5 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Código de lote" htmlFor="b-code" error={errors.code} hint="Ej.: TRT-2024-098" required><input id="b-code" className={`${inputCls} font-mono uppercase`} maxLength={24} value={form.code} onChange={(e) => set("code", e.target.value)} /></Field>
                <Field label="Nombre" htmlFor="b-name" error={errors.name} required><input id="b-name" className={inputCls} maxLength={80} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
                <Field label="Especie" htmlFor="b-species" error={errors.species} required><input id="b-species" className={`${inputCls} italic`} maxLength={80} value={form.species} onChange={(e) => set("species", e.target.value)} placeholder="Oncorhynchus mykiss" /></Field>
                <Field label="Estanque" htmlFor="b-pond" error={errors.pondId}><select id="b-pond" className={inputCls} value={form.pondId} onChange={(e) => set("pondId", e.target.value)}>{PONDS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
                <Field label="Etapa biológica" htmlFor="b-stage" error={errors.stage}><select id="b-stage" className={inputCls} value={form.stage} onChange={(e) => set("stage", e.target.value)}>{BATCH_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}</select></Field>
                <Field label="Alimento" htmlFor="b-feed" error={errors.feedType}><select id="b-feed" className={inputCls} value={form.feedType} onChange={(e) => set("feedType", e.target.value)}>{FEED_TYPES.map((f) => <option key={f} value={f}>{FEED_LABELS[f]}</option>)}</select></Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Población (ejemplares)" error={errors.population} required><NumberStepper ariaLabel="Población" editable value={form.population} onChange={(v) => set("population", v)} min={1} max={1_000_000} step={100} /></Field>
                <Field label="Peso promedio (g)" error={errors.avgWeightG} required><NumberStepper ariaLabel="Peso promedio en gramos" editable value={form.avgWeightG} onChange={(v) => set("avgWeightG", v)} min={0.1} max={50000} step={5} decimals={1} /></Field>
                <Field label="Temperatura agua (°C)" error={errors.waterTempC}><NumberStepper ariaLabel="Temperatura del agua" editable value={form.waterTempC} onChange={(v) => set("waterTempC", v)} min={0} max={40} step={0.5} decimals={1} /></Field>
              </div>

              <div className="flex flex-wrap gap-x-8 gap-y-3">
                <ToggleSwitch label="Auto-alimentación activa" checked={form.autoFeeding} onChange={(v) => set("autoFeeding", v)} />
                <ToggleSwitch label="En cuarentena / observación" checked={form.quarantine} onChange={(v) => set("quarantine", v)} />
              </div>

              <Field label="Notas veterinarias y restricciones" htmlFor="b-notes" error={errors.notes} hint={`${form.notes.length}/500`}>
                <textarea id="b-notes" rows={3} maxLength={500} className="w-full p-3 border border-outline-variant rounded text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </fieldset>
            <div className="flex justify-end gap-3 pt-3 border-t border-surface-container-high">
              <button type="button" className={btnOutline} onClick={() => { setForm(BLANK); setErrors({}); }}>Restablecer</button>
              <button type="submit" className={btnPrimary} disabled={!canWrite || busy}>{busy ? "Guardando…" : "Guardar lote"}</button>
            </div>
          </form>
        </Card>

        <section className="lg:col-span-5 space-y-6" aria-label="Ficha y cálculo">
          <Card className="p-5 space-y-4">
            <div>
              <span className="text-label-sm font-label-sm text-secondary uppercase tracking-wider font-semibold">Ficha activa</span>
              <h3 className="text-headline-md font-headline-md text-on-surface">{form.name || "Lote sin nombre"}</h3>
              <p className="text-body-sm text-secondary italic">{form.species || "Especie sin definir"} • {form.code || "SIN-CÓDIGO"} • {pondName(form.pondId)}</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/60 space-y-3" aria-live="polite">
              <div className="text-label-md font-label-md font-semibold text-on-surface">Tasa de alimentación recomendada</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant/40"><span className="block text-label-sm text-secondary">Biomasa total</span><span className="text-data-metric font-data-metric text-primary">{calc.biomassKg.toFixed(0)}</span> <span className="text-label-md text-secondary">kg</span></div>
                <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant/40"><span className="block text-label-sm text-secondary">Tasa diaria</span><span className="text-data-metric font-data-metric text-on-surface">{calc.rate.toFixed(2)}</span> <span className="text-label-md text-secondary">% biomasa</span></div>
                <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant/40"><span className="block text-label-sm text-secondary">Ración diaria</span><span className="text-data-metric font-data-metric text-primary">{calc.dailyKg.toFixed(1)}</span> <span className="text-label-md text-secondary">kg/día</span></div>
                <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant/40"><span className="block text-label-sm text-secondary">Frecuencia</span><span className="text-data-metric font-data-metric text-on-surface">{calc.doses}</span> <span className="text-label-md text-secondary">dosis · {calc.perDose.toFixed(2)} kg</span></div>
              </div>
              <p className="text-label-sm font-label-sm text-secondary">Calculada por peso medio y temperatura del agua. Referencia orientativa: valide con el veterinario responsable.</p>
            </div>
            <div>
              <h4 className="text-label-lg font-label-lg text-on-surface">Proyección de crecimiento (modelo, 12 semanas)</h4>
              <LineChart ariaLabel="Proyección de peso medio en gramos por semana" labels={calc.weeks.map((w) => `S${w}`)} yFormat={(v) => v.toFixed(0)} height={180} series={[{ name: "Peso proyectado", color: "#004349", values: calc.curve, fmt: (v) => `${v.toFixed(0)} g` }]} />
              <p className="text-label-sm text-secondary">SGR estimado: {calc.sgr.toFixed(2)} %/día</p>
            </div>
          </Card>
        </section>
      </div>

      <Card className="p-5" aria-labelledby="h-list">
        <h2 id="h-list" className="text-headline-sm font-headline-sm text-on-surface mb-3">Lotes registrados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead><tr className="text-secondary text-label-sm uppercase tracking-wider border-b border-surface-container"><th className="py-2 pr-3">Código</th><th className="pr-3">Nombre</th><th className="pr-3">Estanque</th><th className="pr-3 text-right">Población</th><th className="pr-3 text-right">Peso medio</th><th className="pr-3">Estado</th><th></th></tr></thead>
            <tbody className="divide-y divide-surface-container">
              {items.map((b) => (
                <tr key={b.id}>
                  <td className="py-2 pr-3 font-mono">{b.code}</td><td className="pr-3">{b.name}</td><td className="pr-3">{b.pondId}</td>
                  <td className="pr-3 text-right font-mono">{b.population?.toLocaleString("es")}</td><td className="pr-3 text-right font-mono">{b.avgWeightG} g</td>
                  <td className="pr-3">{b.quarantine ? <span className="text-amber-700 font-semibold">Cuarentena</span> : "Normal"}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="text-primary font-semibold hover:underline mr-3" onClick={() => load(b)}>Cargar</button>
                    {can("animals:delete") && !b._demo && <button className="text-error font-semibold hover:underline" onClick={() => setToDelete(b)}>Eliminar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog open={!!toDelete} danger busy={busy} title="Eliminar lote" message={`Se eliminará el lote ${toDelete?.code} de forma permanente.`} confirmLabel="Eliminar" onConfirm={remove} onCancel={() => setToDelete(null)} />
    </AppLayout>
  );
}
