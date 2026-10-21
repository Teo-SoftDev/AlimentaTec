import React, { useEffect, useMemo, useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import AppLayout from "../components/AppLayout.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import NumberStepper from "../components/NumberStepper.jsx";
import PillToggle from "../components/PillToggle.jsx";
import { Banner, Card, DemoBadge, Field, PageHeader, btnOutline, btnPrimary, inputCls } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCollection } from "../hooks/useCollection.js";
import { writeAudit } from "../services/audit.js";
import { sendCommand } from "../services/commands.js";
import { PONDS, SENSOR_LABELS, SENSOR_SNAPSHOT, pondName } from "../utils/constants.js";
import { DEMO_DEVICES, DEMO_SCHEDULES } from "../utils/demoData.js";
import { friendlyError } from "../utils/errors.js";
import { checkWriteRate, formatRetry } from "../utils/rateLimiter.js";
import { DAYS, MECHANISMS, SENSORS, scheduleSchema, validate } from "../utils/validation.js";

const MECH_LABELS = { compuerta: ["Compuerta temporizada", "Descarga por gravedad con compuerta servo-controlada."], neumatica: ["Neumática por ráfagas", "Toberas de aire comprimido para dispersión amplia."], acustica: ["Difusión acústica previa", "Tono bio-acústico 30 s antes para agrupar el cardumen."] };
const ACTIONS = { pause: "Pausar alimentación", reduce: "Reducir dosis 20%", increase: "Aumentar dosis 10%" };
const TODAY = ["D", "L", "M", "X", "J", "V", "S"];
const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const pad = (n) => String(n).padStart(2, "0");
const BLANK = { id: null, name: "", pondId: "AQ-04", time: "08:00", days: ["L", "M", "X", "J", "V"], mechanism: "compuerta", durationSec: 45, doseKg: 3, enabled: true, conditions: [] };

function fmtCountdown(sec) {
  const s = Math.max(0, sec);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
const evalCond = (c) => (c.op === "<" ? SENSOR_SNAPSHOT[c.sensor] < c.value : SENSOR_SNAPSHOT[c.sensor] > c.value);

export default function Schedules() {
  const { actor, can } = useAuth();
  const canWrite = can("schedule:write");
  const schedulesQ = useCollection("schedules", { orderByField: "time", limitN: 200, fallback: DEMO_SCHEDULES });
  const devicesQ = useCollection("devices", { limitN: 200, fallback: DEMO_DEVICES });
  const [pond, setPond] = useState("AQ-04");
  const [draft, setDraft] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const list = useMemo(() => schedulesQ.items.filter((s) => s.pondId === pond).sort((a, b) => a.time.localeCompare(b.time)), [schedulesQ.items, pond]);
  const todayLetter = TODAY[now.getDay()];
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const today = list.filter((s) => s.enabled && s.days.includes(todayLetter));
  const next = today.find((s) => toMin(s.time) * 60 >= nowSec);
  const doneKg = today.filter((s) => toMin(s.time) * 60 < nowSec).reduce((a, s) => a + s.doseKg, 0);
  const totalKg = today.reduce((a, s) => a + s.doseKg, 0);

  const setD = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleDay = (d) => setD("days", draft.days.includes(d) ? draft.days.filter((x) => x !== d) : DAYS.filter((x) => x === d || draft.days.includes(x)));
  const flash = (tone, text) => setNotice({ tone, text });

  async function save(e) {
    e.preventDefault();
    setErrors({}); setNotice(null);
    if (!canWrite) return flash("error", "Su rol no permite modificar horarios.");
    const { id, ...fields } = draft;
    const v = validate(scheduleSchema, { ...fields, pondId: draft.pondId });
    if (!v.ok) return setErrors(v.errors);
    const a = actor();
    const rate = checkWriteRate(a.uid);
    if (!rate.allowed) return flash("error", `Demasiadas operaciones seguidas. Reintente en ${formatRetry(rate.retryAfterMs)}.`);

    const original = schedulesQ.items.find((s) => s.id === id);
    const isNew = !id || id.startsWith("demo-");
    const newId = isNew ? crypto.randomUUID() : id;
    const changed = original ? Object.keys(v.data).filter((k) => JSON.stringify(v.data[k]) !== JSON.stringify(original[k])) : ["nuevo"];
    setBusy(true);
    try {
      await setDoc(doc(db, "schedules", newId), { ...v.data, updatedBy: a.uid, updatedAt: serverTimestamp() });
      // A09: marca temporal (servidor), operador, sesión y diff quedan en el registro de auditoría.
      writeAudit({ actor: a, type: "schedule_change", target: v.data.name, details: { pond: v.data.pondId, hora: v.data.time, dosisKg: v.data.doseKg, campos: changed.join(",") || "sin cambios" } });
      setDraft({ ...BLANK, pondId: pond });
      flash("success", "Horario guardado y registrado en la auditoría.");
    } catch (err) {
      flash("error", friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(s, enabled) {
    try {
      await updateDoc(doc(db, "schedules", s.id), { enabled, updatedBy: actor().uid, updatedAt: serverTimestamp() });
      writeAudit({ actor: actor(), type: "schedule_change", target: s.name, details: { pond: s.pondId, campos: "enabled", despues: enabled } });
    } catch (err) {
      flash("error", friendlyError(err));
    }
  }

  async function runConfirm() {
    setBusy(true);
    try {
      if (confirm.kind === "delete") {
        await deleteDoc(doc(db, "schedules", confirm.s.id));
        writeAudit({ actor: actor(), type: "schedule_delete", target: confirm.s.name, severity: "warning", details: { pond: confirm.s.pondId } });
        flash("success", "Horario eliminado.");
      } else {
        const dev = devicesQ.items.find((d) => d.type === "tolva" && d.pondId === pond && d.status !== "revoked");
        if (!dev) throw new Error("no-device");
        await sendCommand({ actor: actor(), command: { type: "dispense_manual", deviceId: dev.serial, pondId: pond, amountG: Math.min(5000, Math.round(confirm.s.doseKg * 1000)) } });
        flash("success", `Disparo manual de ${confirm.s.doseKg} kg enviado a ${dev.name}.`);
      }
    } catch (err) {
      flash("error", err.message === "no-device" ? "No hay una tolva asignada a este estanque." : friendlyError(err));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const addCondition = () => draft.conditions.length < 5 && setD("conditions", [...draft.conditions, { sensor: "oxygen", op: "<", value: 5.2, action: "pause" }]);
  const setCond = (i, k, v) => setD("conditions", draft.conditions.map((c, j) => (j === i ? { ...c, [k]: v } : c)));

  return (
    <AppLayout active="horarios" searchPlaceholder="Buscar en el historial…">
      <PageHeader
        eyebrow={<><span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span> Control de alimentación automatizada</span><DemoBadge show={schedulesQ.isDemo} /></>}
        title="Programación Cronológica de Alimentación"
        subtitle="Línea de tiempo de 24 h, editor de disparos y automatizaciones por condición de sensores."
        actions={
          <div>
            <label htmlFor="pond" className="block text-label-sm font-label-sm text-secondary mb-1">Estanque</label>
            <select id="pond" className={`${inputCls} w-64`} value={pond} onChange={(e) => { setPond(e.target.value); setDraft({ ...BLANK, pondId: e.target.value }); }}>
              {PONDS.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.species}</option>)}
            </select>
          </div>
        }
      />
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      {schedulesQ.error && <Banner tone="warn">{schedulesQ.error}</Banner>}
      {!canWrite && <Banner tone="info" icon="visibility">Modo solo lectura: su rol no permite crear ni modificar horarios.</Banner>}

      <Card className="p-5 space-y-4" aria-labelledby="h-tl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container-high pb-3">
          <div>
            <h2 id="h-tl" className="text-headline-sm font-headline-sm text-on-surface">Ciclo diario 24 h · {pondName(pond)}</h2>
            <p className="text-body-sm text-secondary">Ración acumulada hoy: <strong className="text-primary">{doneKg.toFixed(1)} kg</strong> de {totalKg.toFixed(1)} kg programados.</p>
          </div>
          <span className="text-primary font-semibold text-label-sm font-label-sm flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>Hora local: {pad(now.getHours())}:{pad(now.getMinutes())}</span>
        </div>
        <div className="relative pt-6 pb-2">
          <div className="h-3 w-full bg-surface-container rounded-full relative overflow-hidden" aria-hidden="true">
            <div className="absolute left-0 top-0 bottom-0 bg-primary-container/20" style={{ width: `${(nowSec / 86400) * 100}%` }}></div>
            {today.map((s) => <div key={s.id} className={`absolute top-0 bottom-0 ${next?.id === s.id ? "w-2.5 bg-amber-500 ring-2 ring-amber-200" : "w-1.5 bg-primary-container"}`} style={{ left: `${(toMin(s.time) / 1440) * 100}%` }} title={s.time}></div>)}
          </div>
          <div className="absolute top-1 -translate-x-1/2 flex flex-col items-center pointer-events-none" style={{ left: `${(nowSec / 86400) * 100}%` }} aria-hidden="true">
            <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">AHORA</span><div className="w-0.5 h-3 bg-emerald-600"></div>
          </div>
          <div className="flex justify-between text-[10px] text-secondary font-mono mt-1" aria-hidden="true"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
        </div>
        {today.length === 0 ? <p className="text-sm text-secondary">No hay disparos programados para hoy en este estanque.</p> : (
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {today.map((s) => {
              const done = toMin(s.time) * 60 < nowSec, isNext = next?.id === s.id;
              return (
                <li key={s.id} className={`rounded p-3 relative ${isNext ? "border-2 border-primary-container bg-primary-fixed/20" : "border border-surface-container-high bg-surface-container-low/50"}`}>
                  {isNext && <span className="absolute top-0 right-0 bg-primary-container text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">PRÓXIMO</span>}
                  <div className="flex items-center justify-between"><span className={`text-label-sm font-label-sm px-2 py-0.5 rounded font-mono ${isNext ? "bg-primary-container text-white font-bold" : done ? "bg-emerald-100 text-emerald-800" : "bg-surface-container-high text-on-surface-variant"}`}>{s.time}</span>{done && <span className="material-symbols-outlined text-emerald-600 text-[18px]" aria-hidden="true">check_circle</span>}</div>
                  <div className={`mt-2 text-label-md font-label-md ${isNext ? "text-primary font-bold" : "text-on-surface"}`}>{s.name}</div>
                  <div className="text-body-sm text-secondary">{s.doseKg} kg • {MECH_LABELS[s.mechanism][0]}</div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-7 p-6" aria-labelledby="h-ed">
          <form onSubmit={save} noValidate className="space-y-5">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-4">
              <h2 id="h-ed" className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary" aria-hidden="true">edit_calendar</span>{draft.id && !draft.id.startsWith("demo-") ? "Editar disparo" : "Nuevo disparo"}</h2>
              {draft.id && <button type="button" className="text-primary text-label-md font-semibold hover:underline" onClick={() => setDraft({ ...BLANK, pondId: pond })}>Crear uno nuevo</button>}
            </div>
            <fieldset disabled={!canWrite || busy} className="space-y-5 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nombre" htmlFor="s-name" error={errors.name} required><input id="s-name" className={inputCls} maxLength={60} value={draft.name} onChange={(e) => setD("name", e.target.value)} /></Field>
                <Field label="Hora de activación (24 h)" htmlFor="s-time" error={errors.time} required><input id="s-time" type="time" className={`${inputCls} font-mono`} value={draft.time} onChange={(e) => setD("time", e.target.value)} /></Field>
              </div>
              <div>
                <span className="block text-sm font-semibold text-on-surface mb-2">Repetición semanal</span>
                <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Días de la semana">
                  {DAYS.map((d) => { const on = draft.days.includes(d); return <button key={d} type="button" aria-pressed={on} onClick={() => toggleDay(d)} className={`w-10 h-10 rounded border text-label-md font-bold transition-colors ${on ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-low text-secondary hover:bg-surface-container"}`}>{d}</button>; })}
                </div>
                {errors.days && <p role="alert" className="text-label-sm text-error mt-1">{errors.days}</p>}
              </div>
              <div>
                <span className="block text-sm font-semibold text-on-surface mb-2">Mecanismo actuador</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {MECHANISMS.map((m) => { const on = draft.mechanism === m; return (
                    <label key={m} className={`p-3 rounded cursor-pointer block ${on ? "border-2 border-primary-container bg-primary-fixed/20" : "border border-outline-variant hover:bg-surface-container-low"}`}>
                      <input type="radio" name="mech" checked={on} onChange={() => setD("mechanism", m)} className="text-primary focus:ring-primary" />
                      <div className={`mt-2 text-label-md font-label-md ${on ? "text-primary font-bold" : "text-on-surface"}`}>{MECH_LABELS[m][0]}</div>
                      <div className="text-[11px] text-secondary mt-1">{MECH_LABELS[m][1]}</div>
                    </label>); })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Duración de dispersión" error={errors.durationSec}><NumberStepper ariaLabel="Duración en segundos" value={draft.durationSec} onChange={(v) => setD("durationSec", v)} min={5} max={180} step={5} unit="s" /></Field>
                <Field label="Dosis / masa" error={errors.doseKg}><NumberStepper ariaLabel="Dosis en kilogramos" value={draft.doseKg} onChange={(v) => setD("doseKg", v)} min={0.1} max={50} step={0.25} decimals={2} unit="kg" /></Field>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-label-sm font-label-sm text-secondary font-bold uppercase tracking-wider">Reglas condicionales por sensor</span>
                  <button type="button" onClick={addCondition} disabled={draft.conditions.length >= 5} className="text-primary text-label-sm font-semibold hover:underline flex items-center gap-1 disabled:opacity-40"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>Agregar condición</button>
                </div>
                {errors.conditions && <p role="alert" className="text-label-sm text-error">{errors.conditions}</p>}
                {draft.conditions.length === 0 && <p className="text-sm text-secondary">Sin condiciones: el disparo se ejecuta siempre a la hora programada.</p>}
                {draft.conditions.map((c, i) => {
                  const active = evalCond(c);
                  return (
                    <div key={i} className={`p-3 rounded border grid grid-cols-2 sm:grid-cols-12 gap-2 items-center ${active ? "bg-red-50/50 border-red-200" : "bg-teal-50/50 border-teal-200"}`}>
                      <span className="sm:col-span-1 text-sm font-semibold">Si</span>
                      <select aria-label="Sensor" className={`${inputCls} sm:col-span-4`} value={c.sensor} onChange={(e) => setCond(i, "sensor", e.target.value)}>{SENSORS.map((s) => <option key={s} value={s}>{SENSOR_LABELS[s]}</option>)}</select>
                      <select aria-label="Operador" className={`${inputCls} sm:col-span-2`} value={c.op} onChange={(e) => setCond(i, "op", e.target.value)}><option value="<">menor que</option><option value=">">mayor que</option></select>
                      <input aria-label="Valor umbral" type="number" step="0.1" className={`${inputCls} sm:col-span-2 font-mono`} value={c.value} onChange={(e) => setCond(i, "value", e.target.value === "" ? NaN : parseFloat(e.target.value))} />
                      <select aria-label="Acción" className={`${inputCls} sm:col-span-3`} value={c.action} onChange={(e) => setCond(i, "action", e.target.value)}>{Object.entries(ACTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                      <div className="col-span-2 sm:col-span-12 flex items-center justify-between text-label-sm font-label-sm">
                        <span className={active ? "text-error font-semibold" : "text-secondary"}>Lectura actual {SENSOR_SNAPSHOT[c.sensor]} → {active ? "regla ACTIVA ahora" : "en rango normal"}</span>
                        <button type="button" onClick={() => setD("conditions", draft.conditions.filter((_, j) => j !== i))} aria-label="Eliminar condición" className="text-secondary hover:text-error"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
              <button type="button" className={btnOutline} onClick={() => { setDraft({ ...BLANK, pondId: pond }); setErrors({}); }}>Descartar cambios</button>
              <button type="submit" className={btnPrimary} disabled={!canWrite || busy}>{busy ? "Guardando…" : "Guardar horario"}</button>
            </div>
          </form>
        </Card>

        <section className="xl:col-span-5 space-y-6">
          {next && (
            <Card className="border-2 border-primary/30 p-5">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-label-sm font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>PRÓXIMO EVENTO</span>
              <div className="mt-4 flex items-baseline justify-between">
                <div><div className="text-headline-xl font-headline-xl text-primary font-mono tracking-tight" aria-live="off">{fmtCountdown(toMin(next.time) * 60 - nowSec)}</div><div className="text-label-sm text-secondary">hasta «{next.name}» ({next.time})</div></div>
                <div className="text-headline-sm font-bold font-mono">{next.doseKg.toFixed(2)} kg</div>
              </div>
              <button disabled={!can("command")} onClick={() => setConfirm({ kind: "force", s: next })} className="mt-5 w-full bg-amber-600 hover:bg-amber-700 text-white py-2 px-3 rounded text-label-sm font-bold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">play_circle</span>Forzar disparo manual ahora</button>
            </Card>
          )}
          <Card className="p-5 space-y-4" aria-labelledby="h-auto">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <h3 id="h-auto" className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary" aria-hidden="true">tune</span>Automatizaciones</h3>
              <span className="text-label-sm text-secondary font-mono">{list.length} rutina(s)</span>
            </div>
            <ul className="space-y-3">
              {list.length === 0 && <li className="text-sm text-secondary">Este estanque no tiene horarios.</li>}
              {list.map((s) => (
                <li key={s.id} className={`p-3.5 rounded border flex items-center justify-between gap-3 ${draft.id === s.id ? "border-2 border-primary bg-primary-fixed/10" : "border-surface-container-high bg-surface"} ${s.enabled ? "" : "opacity-70"}`}>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-label-md font-bold text-primary">{s.time}</span><span className="text-label-sm font-semibold text-on-surface">{s.name}</span></div>
                    <div className="text-[12px] text-secondary">{s.days.join(", ")} • {s.doseKg} kg • {MECH_LABELS[s.mechanism][0]}{s.conditions?.length ? ` • ${s.conditions.length} regla(s)` : ""}</div>
                    <div className="flex gap-3 text-label-sm">
                      <button className="text-primary font-semibold hover:underline" onClick={() => { setDraft({ ...BLANK, ...s }); setErrors({}); }}>Editar</button>
                      {canWrite && !s._demo && <button className="text-error font-semibold hover:underline" onClick={() => setConfirm({ kind: "delete", s })}>Eliminar</button>}
                    </div>
                  </div>
                  <PillToggle label={`Activar ${s.name}`} checked={s.enabled} disabled={!canWrite || s._demo} onChange={(v) => toggleEnabled(s, v)} />
                </li>
              ))}
            </ul>
            {schedulesQ.isDemo && <p className="text-label-sm text-secondary">Pulse «Editar» y guarde para crear su primer horario real.</p>}
          </Card>
        </section>
      </div>

      <ConfirmDialog open={!!confirm} busy={busy} danger={confirm?.kind === "delete"} title={confirm?.kind === "delete" ? "Eliminar horario" : "Forzar disparo manual"} message={confirm?.kind === "delete" ? `Se eliminará «${confirm?.s.name}».` : `Se dispensarán ${confirm?.s.doseKg} kg ahora mismo en ${pondName(pond)}.`} confirmLabel={confirm?.kind === "delete" ? "Eliminar" : "Dispensar"} onConfirm={runConfirm} onCancel={() => setConfirm(null)} />
    </AppLayout>
  );
}
