import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import AppLayout from "../components/AppLayout.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import LineChart from "../components/LineChart.jsx";
import NumberStepper from "../components/NumberStepper.jsx";
import PinDialog from "../components/PinDialog.jsx";
import { Banner, Card, DemoBadge, PageHeader, btnOutline, btnPrimary, inputCls } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCollection } from "../hooks/useCollection.js";
import { writeAudit } from "../services/audit.js";
import { sendCommand } from "../services/commands.js";
import { DEMO_DEVICES } from "../utils/demoData.js";
import { friendlyError } from "../utils/errors.js";
import { checkWriteRate, formatRetry } from "../utils/rateLimiter.js";
import { dosingSchema, validate } from "../utils/validation.js";
import { pondName } from "../utils/constants.js";

const HOPPER_META = {
  A: { name: "Pellet proteico 45/12", detail: "Extruido 3,2 mm · alta flotabilidad", color: "bg-primary", level: 82 },
  B: { name: "Suplemento vitamínico/mineral", detail: "Premezcla C+E+Zinc", color: "bg-primary-container", level: 64 },
  C: { name: "Probiótico / medicación", detail: "Bacillus spp.", color: "bg-tertiary-container", level: 41 },
};
const MASS_TOTAL_G = 1000; // por encima de esto (o >1 ración) se exige PIN
const BINS = 16;

export default function Dosing() {
  const { actor, can } = useAuth();
  const devicesQ = useCollection("devices", { limitN: 200, fallback: DEMO_DEVICES });
  const configsQ = useCollection("dosingConfigs", { limitN: 100 });
  const tolvas = devicesQ.items.filter((d) => d.type === "tolva" && d.status !== "revoked");

  const [deviceId, setDeviceId] = useState("");
  const [portion, setPortion] = useState(250);
  const [mode, setMode] = useState("biomasa");
  const [radius, setRadius] = useState(3.8);
  const [hop, setHop] = useState({ A: 60, B: 30, C: 10 });
  const [rations, setRations] = useState(1);
  const [weight, setWeight] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState({ real: 249.4, dev: -0.24, cv: 0.82 });
  const [noise, setNoise] = useState(() => Array.from({ length: BINS }, (_, i) => Math.sin(i * 1.7) * 0.05));
  const [pinOpen, setPinOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const loadedFor = useRef("");

  useEffect(() => { if (!deviceId && tolvas.length) setDeviceId(tolvas[0].serial); }, [tolvas, deviceId]);
  const device = tolvas.find((d) => d.serial === deviceId);

  // Carga la configuración guardada del dispositivo (una vez por dispositivo).
  useEffect(() => {
    if (!deviceId || loadedFor.current === deviceId || configsQ.loading) return;
    loadedFor.current = deviceId;
    const c = configsQ.items.find((x) => x.id === deviceId);
    if (c) { setPortion(c.portionG); setMode(c.mode); setRadius(c.radiusM); setHop(Object.fromEntries(c.hoppers.map((h) => [h.id, h.percent]))); }
  }, [deviceId, configsQ.items, configsQ.loading]);

  const total = hop.A + hop.B + hop.C;
  const flash = (tone, text) => setNotice({ tone, text });
  const targetTotal = portion * rations;
  const isMass = rations > 1 || targetTotal > MASS_TOTAL_G;

  const curve = useMemo(() => {
    const labels = Array.from({ length: BINS }, (_, i) => ((i * radius) / (BINS - 1)).toFixed(1));
    const theo = labels.map((_, i) => 100 * Math.exp(-Math.pow(i / (BINS - 1) / 0.55, 2)));
    return { labels, theo, real: theo.map((v, i) => Math.max(0, v * (1 + noise[i]))) };
  }, [radius, noise]);

  async function save() {
    setNotice(null);
    const v = validate(dosingSchema, { deviceId, portionG: portion, mode, radiusM: radius, hoppers: ["A", "B", "C"].map((id) => ({ id, percent: hop[id] })) });
    if (!v.ok) return flash("error", Object.values(v.errors)[0]);
    const a = actor();
    const rate = checkWriteRate(a.uid);
    if (!rate.allowed) return flash("error", `Demasiadas operaciones seguidas. Reintente en ${formatRetry(rate.retryAfterMs)}.`);
    setBusy(true);
    try {
      await setDoc(doc(db, "dosingConfigs", deviceId), { ...v.data, updatedBy: a.uid, updatedAt: serverTimestamp() });
      writeAudit({ actor: a, type: "dosing_change", target: deviceId, details: { porcionG: portion, modo: mode, mezcla: `${hop.A}/${hop.B}/${hop.C}` } });
      flash("success", "Configuración de dosificación guardada y auditada.");
    } catch (e) {
      flash("error", friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  function requestTest() {
    setNotice(null);
    if (!deviceId) return flash("error", "Seleccione un dispensador.");
    if (isMass) setPinOpen(true);
    else setConfirmOpen(true);
  }

  async function executeTest() {
    setPinOpen(false); setConfirmOpen(false);
    setRunning(true); setWeight(0);
    try {
      await sendCommand({ actor: actor(), command: { type: "dispense_test", deviceId, pondId: device?.pondId, amountG: Math.round(portion), rations } });
    } catch (e) {
      setRunning(false);
      return flash("error", friendlyError(e));
    }
    const real = targetTotal * (1 + (Math.random() - 0.5) * 0.012);
    const steps = 20;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setWeight(+(real * (i / steps) + (Math.random() - 0.5) * 0.1).toFixed(1));
      if (i >= steps) {
        clearInterval(timer);
        setWeight(+real.toFixed(1));
        setNoise(Array.from({ length: BINS }, () => (Math.random() - 0.5) * 0.18));
        setResult({ real: +real.toFixed(1), dev: +(((real - targetTotal) / targetTotal) * 100).toFixed(2), cv: +(0.5 + Math.random() * 0.7).toFixed(2) });
        setRunning(false);
        flash("success", `Prueba completada: ${real.toFixed(1)} g dispensados (objetivo ${targetTotal} g).`);
      }
    }, 100);
  }

  const canTest = can("command");
  const canSave = can("dosing:write");

  return (
    <AppLayout active="dosificacion" searchPlaceholder="Buscar en el historial…">
      <PageHeader
        eyebrow={<><span className="bg-secondary-container text-on-secondary-fixed px-2 py-0.5 rounded uppercase tracking-wider">Bio-Control Acuático</span><DemoBadge show={devicesQ.isDemo} /></>}
        title="Configuración de Porciones y Calibración de Ración"
        subtitle="Gramaje por evento, mezcla multitolva y pruebas de descarga con celda de carga."
        actions={
          <>
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded p-1">
              <label htmlFor="dev" className="text-label-sm text-secondary px-2">Dispensador:</label>
              <select id="dev" className="bg-transparent text-label-md border-0 focus:ring-0 py-1 pl-1 pr-6" value={deviceId} onChange={(e) => { setDeviceId(e.target.value); loadedFor.current = ""; }}>
                {tolvas.map((d) => <option key={d.id} value={d.serial}>{d.name} ({d.serial})</option>)}
              </select>
            </div>
            <button className={btnPrimary} onClick={save} disabled={!canSave || busy || total !== 100}><span className="material-symbols-outlined text-base" aria-hidden="true">cloud_upload</span>Guardar y aplicar</button>
          </>
        }
      />
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      {!canSave && <Banner tone="info" icon="visibility">Modo solo lectura: su rol no permite cambiar la dosificación.</Banner>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 space-y-5" aria-labelledby="h-port">
            <h2 id="h-port" className="text-headline-sm font-headline-sm text-on-surface">Calibración de gramaje por evento</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface-container-low rounded-lg border border-surface-container-high">
              <div className="md:col-span-2">
                <span className="text-label-sm text-secondary uppercase tracking-wider">Peso de ración objetivo</span>
                <div className="flex items-baseline gap-2 mt-1"><span className="text-data-metric font-data-metric text-primary">{portion.toFixed(1)}</span><span className="text-label-lg text-secondary">g / ciclo</span><span className="text-label-sm bg-surface-container px-2 py-0.5 rounded text-outline font-mono">± 2.0 g</span></div>
                <input aria-label="Peso de ración objetivo en gramos" type="range" min={50} max={500} step={5} value={portion} disabled={!canSave} onChange={(e) => setPortion(+e.target.value)} className="w-full accent-primary mt-4 cursor-pointer" />
                <div className="flex justify-between text-label-sm text-secondary"><span>50 g</span><span>275 g</span><span>500 g</span></div>
              </div>
              <div className="flex flex-col justify-between md:border-l border-surface-container-high md:pl-4">
                <span className="text-label-sm text-secondary mb-2">Ajuste de precisión</span>
                <NumberStepper ariaLabel="Ajuste fino de gramaje" value={portion} onChange={setPortion} min={50} max={500} step={0.5} decimals={1} unit="g" disabled={!canSave} />
              </div>
            </div>
            <fieldset disabled={!canSave} className="border-t border-surface-container-high pt-4">
              <legend className="text-label-md font-semibold text-on-surface mb-2">Modo de cálculo de ración global</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[["biomasa", "Porcentaje de biomasa total", "Ajuste dinámico según biomasa estimada (1,8% peso vivo/día)."], ["fija", "Ración fija por cabeza", "Dosis fija multiplicada por el censo del estanque."]].map(([id, t, d]) => (
                  <label key={id} className={`flex items-start gap-3 p-3 rounded cursor-pointer ${mode === id ? "border-2 border-primary bg-secondary-container/20" : "border border-outline-variant hover:border-outline"}`}>
                    <input type="radio" name="calc_mode" checked={mode === id} onChange={() => setMode(id)} className="mt-1 text-primary focus:ring-primary" />
                    <div><div className="text-label-md font-semibold text-on-surface">{t}</div><div className="text-body-sm text-secondary">{d}</div></div>
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>

          <Card className="p-6 space-y-4" aria-labelledby="h-mix">
            <div className="flex justify-between items-center">
              <h2 id="h-mix" className="text-headline-sm font-headline-sm text-on-surface">Mezcla multitolva</h2>
              <span className={`text-label-sm font-mono px-2 py-1 rounded font-bold ${total === 100 ? "bg-primary-fixed text-on-primary-fixed" : "bg-error-container text-on-error-container"}`}>Total: {total}% {total !== 100 && "(debe ser 100%)"}</span>
            </div>
            <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden flex" aria-hidden="true">
              {["A", "B", "C"].map((id) => <div key={id} className={`${HOPPER_META[id].color} h-full transition-all`} style={{ width: `${(hop[id] / Math.max(total, 1)) * Math.min(total, 100)}%` }}></div>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["A", "B", "C"].map((id) => (
                <div key={id} className="border border-surface-container-high rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-label-md font-bold"><span className={`w-3 h-3 rounded-sm ${HOPPER_META[id].color}`}></span>Tolva {id}</span><span className="text-label-sm text-secondary font-mono">{HOPPER_META[id].level}% nivel</span></div>
                  <div><div className="text-body-sm font-medium text-on-surface">{HOPPER_META[id].name}</div><div className="text-label-sm text-secondary">{HOPPER_META[id].detail}</div></div>
                  <NumberStepper ariaLabel={`Porcentaje tolva ${id}`} value={hop[id]} onChange={(v) => setHop((h) => ({ ...h, [id]: v }))} min={0} max={100} step={5} unit="%" disabled={!canSave} />
                  <div className="text-right text-label-md font-bold text-primary">{((portion * hop[id]) / 100).toFixed(1)} g por ración</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-4" aria-labelledby="h-disp">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div><h2 id="h-disp" className="text-headline-sm font-headline-sm text-on-surface">Curva de dispersión: teórica vs. real</h2><p className="text-body-sm text-secondary">Densidad de alimento (%) según la distancia al cañón. La curva real se actualiza con cada prueba.</p></div>
              <div className="flex gap-3 text-label-sm"><span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-outline"></span>Teórica</span><span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-primary"></span>Real (medida)</span></div>
            </div>
            <LineChart ariaLabel="Curva de dispersión teórica frente a real" labels={curve.labels.map((l) => `${l} m`)} yFormat={(v) => `${v.toFixed(0)}%`} area={false} height={200}
              series={[{ name: "Teórica", color: "#6f797a", values: curve.theo, dashed: true, fmt: (v) => `${v.toFixed(1)} %` }, { name: "Real", color: "#004349", values: curve.real, fmt: (v) => `${v.toFixed(1)} %` }]} />
            <div>
              <div className="flex justify-between mb-1"><label htmlFor="radius" className="text-label-md font-semibold">Radio de dispersión</label><span className="font-mono text-label-md font-bold text-primary">{radius.toFixed(1)} m</span></div>
              <input id="radius" type="range" min={1.5} max={5} step={0.1} value={radius} disabled={!canSave} onChange={(e) => setRadius(+e.target.value)} className="w-full accent-primary cursor-pointer" />
              <div className="flex justify-between text-label-sm text-secondary"><span>1,5 m focalizado</span><span>5,0 m máxima cobertura</span></div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 space-y-4" aria-labelledby="h-test">
            <div className="flex items-center justify-between"><h2 id="h-test" className="text-headline-sm font-headline-sm text-on-surface">Prueba de descarga</h2><span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-label-sm rounded">Celda simulada</span></div>
            <div className="bg-surface-container-low border border-surface-container-high rounded-lg p-4 text-center">
              <span className="text-label-sm text-secondary uppercase tracking-wider block">Lectura de celda</span>
              <div className="flex items-center justify-center gap-2" aria-live="polite"><span className="text-3xl font-mono font-bold text-on-surface">{weight.toFixed(1)}</span><span className="text-label-lg text-secondary">g</span></div>
              <div className="text-label-sm text-secondary flex items-center justify-center gap-1"><span className={`w-2 h-2 rounded-full ${running ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>{running ? "Dispensando…" : "Estable"}</div>
            </div>
            <div>
              <span className="block text-label-md font-semibold text-on-surface mb-1.5">Raciones a dispensar</span>
              <NumberStepper ariaLabel="Cantidad de raciones" value={rations} onChange={setRations} min={1} max={10} step={1} disabled={running || !canTest} />
              <p className="text-label-sm text-secondary mt-1">Total: <strong>{targetTotal} g</strong> {isMass && <span className="text-error font-semibold">· prueba masiva: requiere PIN</span>}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className={btnOutline} onClick={() => setWeight(0)} disabled={running}><span className="material-symbols-outlined text-base" aria-hidden="true">scale</span>Tarar cero</button>
              <button className={btnPrimary} onClick={requestTest} disabled={running || !canTest}><span className="material-symbols-outlined text-base" aria-hidden="true">{isMass ? "lock" : "play_arrow"}</span>Ejecutar</button>
            </div>
            <dl className="p-3 bg-surface-container-low rounded border border-surface-container-high space-y-1 text-body-sm">
              <div className="flex justify-between"><dt className="text-secondary">Dispersión real:</dt><dd className="font-mono text-emerald-700 font-semibold">{result.real} g ({result.dev > 0 ? "+" : ""}{result.dev}%)</dd></div>
              <div className="flex justify-between"><dt className="text-secondary">Coef. variación:</dt><dd className="font-mono">{result.cv}% {result.cv < 1 ? "(Excelente)" : "(Aceptable)"}</dd></div>
              <div className="flex justify-between"><dt className="text-secondary">Dispositivo:</dt><dd className="font-mono">{device ? pondName(device.pondId) : "—"}</dd></div>
            </dl>
            <p className="text-label-sm text-secondary">Los comandos están limitados (1 cada 10 s y 5 cada 10 min por equipo) para evitar sobre-alimentación.</p>
          </Card>

          <Card className="p-6 space-y-3" aria-labelledby="h-safe">
            <h2 id="h-safe" className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-tertiary" aria-hidden="true">shield</span>Límites de seguridad</h2>
            {[["Ración máxima diaria", "12,5 kg / día", "text-error", "Consumido hoy: 7,25 kg (58%)"], ["Bloqueo por oxígeno disuelto", "< 5,2 mg/L", "text-primary", "Corta el flujo ante estrés respiratorio."], ["Intervalo mínimo entre comandos", "10 s", "text-on-surface", "Impide ráfagas consecutivas no espaciadas."]].map(([t, v, c, d]) => (
              <div key={t} className="p-3 bg-surface-container-low rounded border border-surface-container-high"><div className="flex justify-between text-label-md"><span>{t}</span><span className={`font-mono font-bold ${c}`}>{v}</span></div><p className="text-[11px] text-secondary">{d}</p></div>
            ))}
          </Card>
        </div>
      </div>

      <ConfirmDialog open={confirmOpen} title="Confirmar prueba de descarga" message={`Se dispensarán ${targetTotal} g desde ${device?.name || "el dispensador"}. Quedará registrado en la auditoría.`} confirmLabel="Ejecutar prueba" onConfirm={executeTest} onCancel={() => setConfirmOpen(false)} />
      <PinDialog open={pinOpen} reason={`Prueba masiva de ${targetTotal} g (${rations} raciones). Ingrese su PIN para autorizarla.`} onVerified={executeTest} onCancel={() => setPinOpen(false)} />
    </AppLayout>
  );
}
