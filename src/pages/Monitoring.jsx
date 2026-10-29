import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import AppLayout from "../components/AppLayout.jsx";
import CameraSimulator from "../components/CameraSimulator.jsx";
import LineChart from "../components/LineChart.jsx";
import { Banner, Card, PageHeader, btnOutline, btnPrimary } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCollection } from "../hooks/useCollection.js";
import { useSimulator } from "../simulator/SimulatorContext.jsx";
import { nextOccurrence } from "../simulator/occurrences.js";
import { sendCommand } from "../services/commands.js";
import { PONDS, pondName } from "../utils/constants.js";
import { DEMO_DEVICES, DEMO_SCHEDULES } from "../utils/demoData.js";
import { friendlyError } from "../utils/errors.js";
import { REJECT_REASONS, TelemetryVerifier, createSimulatedDevice } from "../utils/telemetry.js";
import { STATUS_STYLES, WATER_METRICS, statusFor, worstStatus } from "../utils/thresholds.js";

const MAX_POINTS = 30;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const timeLabel = (d = new Date()) => d.toLocaleTimeString("es", { hour12: false });
const simId = (pond) => `SIM-${pond}`; // dispositivo simulado de cada estanque (clave pública registrada en el verificador)
const baseOf = (i) => ({ ph: 7.4, oxygen: 7.9 - i * 0.2, temperature: 14.2 + i * 0.6, turbidity: 1.8 + i * 0.1 });

function seed(i) {
  const b = baseOf(i);
  const rep = (v) => Array.from({ length: MAX_POINTS }, () => v);
  return {
    labels: Array.from({ length: MAX_POINTS }, (_, k) => timeLabel(new Date(Date.now() - (MAX_POINTS - 1 - k) * 3000))),
    ph: rep(b.ph), oxygen: rep(b.oxygen), temperature: rep(b.temperature), turbidity: rep(b.turbidity), feed: rep(10), response: rep(55),
  };
}

export default function Monitoring() {
  const { actor, can, audit } = useAuth();
  const sim = useSimulator();
  const [params, setParams] = useSearchParams();
  const initial = PONDS.some((p) => p.id === params.get("pond")) ? params.get("pond") : "AQ-04";
  const [pond, setPondState] = useState(initial);
  const [hists, setHists] = useState(() => Object.fromEntries(PONDS.map((p, i) => [p.id, seed(i)])));
  const [counts, setCounts] = useState(() => Object.fromEntries(PONDS.map((p) => [p.id, { ok: 0, rejected: 0 }])));
  const [events, setEvents] = useState([]);
  const [manualUntil, setManualUntil] = useState({});
  const [notice, setNotice] = useState(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now());

  const apiQ = useCollection("pondStatus", { limitN: 20 });
  const devicesQ = useCollection("devices", { limitN: 200, fallback: DEMO_DEVICES });
  const schedulesQ = useCollection("schedules", { limitN: 200, fallback: DEMO_SCHEDULES });

  const setPond = (id) => { setPondState(id); setParams({ pond: id }, { replace: true }); };
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  /* ---------- ¿cae comida en este estanque? (horario automático o dosis manual) ---------- */
  const autoRunning = (id) =>
    sim.snap.running.find((r) => r.pondId === id) ||
    sim.events.find((e) => e.pondId === id && e.status === "running" && now - (e.executedAtMs || 0) < 60_000); // evento publicado por cualquier equipo
  const feedingMap = Object.fromEntries(PONDS.map((p) => [p.id, !!autoRunning(p.id) || (manualUntil[p.id] || 0) > now]));
  const auto = autoRunning(pond);
  const manual = (manualUntil[pond] || 0) > now;
  const feeding = feedingMap[pond];

  const s = useRef({ devices: {}, verifier: null, v: {}, lowUntil: {}, lastAlert: {}, tamper: {}, selected: pond, feeding: {} });
  s.current.selected = pond;
  s.current.feeding = feedingMap;

  const pushEvent = (p, e) => setEvents((ev) => [{ id: crypto.randomUUID(), pond: p, time: timeLabel(), ...e }, ...ev].slice(0, 60));

  async function tick() {
    const st = s.current;
    if (!st.verifier) return;
    const t = Date.now();
    const nextHist = {}, countDelta = {};
    for (const [i, p] of PONDS.entries()) {
      const dev = st.devices[p.id];
      if (!dev) continue;
      const base = baseOf(i);
      const cur = (st.v[p.id] ||= { ...base });
      const low = t < (st.lowUntil[p.id] || 0);
      const walk = (c, target, step, lo, hi) => clamp(c + (target - c) * 0.25 + (Math.random() - 0.5) * step, lo, hi);
      st.v[p.id] = { ph: walk(cur.ph, base.ph, 0.06, 6, 9), oxygen: walk(cur.oxygen, low ? 4.4 : base.oxygen, 0.15, 2, 12), temperature: walk(cur.temperature, base.temperature, 0.12, 8, 24), turbidity: walk(cur.turbidity, base.turbidity, 0.12, 0.2, 8) };
      const readings = Object.fromEntries(Object.entries(st.v[p.id]).map(([k, v]) => [k, +v.toFixed(2)]));
      const tamper = !!st.tamper[p.id];
      st.tamper[p.id] = false;
      const { packet, signature } = await dev.emit(readings, { tamper });
      const res = await st.verifier.verify(packet, signature);
      if (!res.ok) {
        countDelta[p.id] = { rejected: 1 };
        pushEvent(p.id, { status: "crit", icon: "gpp_bad", text: `Paquete rechazado de ${packet.deviceId}: ${REJECT_REASONS[res.reason]}` });
        audit("telemetry_rejected", packet.deviceId, { motivo: REJECT_REASONS[res.reason], pond: p.id }, "critical");
        continue;
      }
      const r = res.packet.readings;
      countDelta[p.id] = { ok: 1 };
      const feedingNow = !!st.feeding[p.id];
      nextHist[p.id] = { r, feed: feedingNow ? 18 + Math.random() * 2 : 9 + Math.random() * 2, resp: clamp((feedingNow ? 82 : 55) + (Math.random() - 0.5) * 8, 0, 100) };

      if (statusFor("oxygen", r.oxygen) === "crit") {
        pushEvent(p.id, { status: "crit", icon: "error", text: `Oxígeno disuelto crítico: ${r.oxygen} mg/L` });
        const a = actor();
        if (a && can("command") && t - (st.lastAlert[p.id] || 0) > 60_000) {
          st.lastAlert[p.id] = t;
          addDoc(collection(db, "alerts"), { severity: "critical", metric: "oxygen", value: r.oxygen, pond: p.id, message: `Oxígeno disuelto bajo el umbral crítico (${r.oxygen} mg/L)`, uid: a.uid, ts: serverTimestamp() }).catch(() => {});
        }
      }
    }
    const add = (arr, v) => [...arr, v].slice(-MAX_POINTS);
    const label = timeLabel();
    setHists((h) => {
      const out = { ...h };
      for (const [id, n] of Object.entries(nextHist)) out[id] = { labels: add(h[id].labels, label), ph: add(h[id].ph, n.r.ph), oxygen: add(h[id].oxygen, n.r.oxygen), temperature: add(h[id].temperature, n.r.temperature), turbidity: add(h[id].turbidity, n.r.turbidity), feed: add(h[id].feed, n.feed), response: add(h[id].response, n.resp) };
      return out;
    });
    setCounts((c) => {
      const out = { ...c };
      for (const [id, d] of Object.entries(countDelta)) out[id] = { ok: c[id].ok + (d.ok || 0), rejected: c[id].rejected + (d.rejected || 0) };
      return out;
    });
  }

  useEffect(() => {
    let alive = true, timer;
    (async () => {
      const verifier = new TelemetryVerifier();
      for (const p of PONDS) {
        const device = await createSimulatedDevice(simId(p.id));
        await verifier.registerDevice(simId(p.id), device.publicJwk); // solo clave PÚBLICA
        s.current.devices[p.id] = device;
      }
      if (!alive) return;
      s.current.verifier = verifier;
      setReady(true);
      pushEvent(null, { status: "ok", icon: "verified", text: "Sensores simulados registrados: telemetría firmada (ECDSA P-256)" });
      timer = setInterval(tick, 3000);
      tick();
    })();
    return () => { alive = false; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando empieza/termina una alimentación automática, queda anotada en el registro del estanque.
  const lastAuto = useRef({});
  useEffect(() => {
    for (const p of PONDS) {
      const a = autoRunning(p.id);
      const key = a?.id || a?.occurrenceId || null;
      if (key && lastAuto.current[p.id] !== key) {
        lastAuto.current[p.id] = key;
        pushEvent(p.id, { status: "ok", icon: "restaurant", text: `Alimentación automática «${a.name || a.scheduleName}»: ${a.doseKg} kg` });
      } else if (!key) lastAuto.current[p.id] = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.snap.running, sim.events]);

  const tolva = devicesQ.items.find((d) => d.type === "tolva" && d.pondId === pond && d.status !== "revoked");

  async function dispense() {
    setNotice(null);
    if (!tolva) return setNotice({ tone: "warn", text: `${pondName(pond)} no tiene un comedero registrado. Regístrelo en Dispositivos.` });
    try {
      await sendCommand({ actor: actor(), command: { type: "dispense_manual", deviceId: tolva.serial, pondId: pond, amountG: 250 } });
      setManualUntil((m) => ({ ...m, [pond]: Date.now() + 9000 }));
      pushEvent(pond, { status: "ok", icon: "bolt", text: "Micro-dosis manual de 250 g enviada" });
    } catch (e) {
      setNotice({ tone: "error", text: friendlyError(e) });
    }
  }

  const hist = hists[pond];
  const last = (k) => hist[k][hist[k].length - 1];
  const kpis = ["ph", "oxygen", "temperature", "turbidity"].map((m) => ({ m, v: last(m), st: statusFor(m, last(m)) }));
  const pondSchedules = schedulesQ.items.filter((x) => x.pondId === pond).sort((a, b) => a.time.localeCompare(b.time));
  const enabledSchedules = pondSchedules.filter((x) => x.enabled);
  const nxt = nextOccurrence(schedulesQ.items.filter((x) => x.enabled), now, pond);
  const idx = PONDS.findIndex((p) => p.id === pond);
  const pondStatusOf = (id) => { const h = hists[id]; return worstStatus(["ph", "oxygen", "temperature", "turbidity"].map((m) => statusFor(m, h[m][h[m].length - 1]))); };
  const pondEvents = events.filter((e) => e.pond === pond || e.pond === null);
  const progress = auto ? (sim.snap.running.find((r) => r.pondId === pond)?.progress ?? auto.progress ?? 30) : null;
  const apiForPond = apiQ.items.find((p) => p.id === pond);

  return (
    <AppLayout active="monitoreo">
      <PageHeader
        eyebrow={<span className="px-2 py-0.5 rounded font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>{ready ? "Telemetría firmada activa" : "Iniciando…"}</span>}
        title="Monitoreo de Telemetría y Consumo en Tiempo Real"
        subtitle={`${pondName(pond)} · ${PONDS[idx]?.species}. Solo se aceptan paquetes con firma válida de dispositivos registrados.`}
      />

      <nav aria-label="Elegir estanque" className="flex flex-wrap gap-2">
        {PONDS.map((p) => {
          const on = p.id === pond, st = STATUS_STYLES[pondStatusOf(p.id)];
          return (
            <button key={p.id} onClick={() => setPond(p.id)} aria-pressed={on} className={`px-4 py-2 rounded-lg border-2 text-left transition-colors ${on ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container"}`}>
              <span className="flex items-center gap-2 font-semibold text-sm"><span className={`w-2.5 h-2.5 rounded-full ${st.bar}`}></span>{p.name}{feedingMap[p.id] && <span className="material-symbols-outlined text-[16px] animate-pulse" aria-label="Alimentando">restaurant</span>}</span>
              <span className={`text-label-sm ${on ? "text-on-primary/80" : "text-secondary"}`}>{p.species}</span>
            </button>
          );
        })}
      </nav>

      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}

      <Card className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Horarios automáticos del estanque">
        <span className="flex items-center gap-2 font-semibold text-on-surface"><span className="material-symbols-outlined text-primary" aria-hidden="true">schedule</span>Alimentación automática</span>
        {enabledSchedules.length === 0 ? (
          <span className="text-body-sm text-secondary">Este estanque no tiene horarios activos. <Link to="/horarios" className="text-primary font-semibold hover:underline">Crear un horario</Link></span>
        ) : (
          <>
            <span className="flex flex-wrap gap-1.5">{enabledSchedules.map((x) => <span key={x.id} className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-mono text-label-md">{x.time}</span>)}</span>
            {nxt && <span className="text-body-sm text-secondary">Próxima: <strong className="text-on-surface">{nxt.time}</strong> · {nxt.scheduleName} · {nxt.doseKg} kg</span>}
            <span className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-label-sm font-semibold ${sim.snap.enabled ? "bg-sky-50 border-sky-300 text-sky-900" : "bg-amber-50 border-amber-400 text-amber-900"}`}>
              <span className={`w-2 h-2 rounded-full ${sim.snap.enabled ? "bg-sky-600 animate-pulse" : "bg-amber-500"}`}></span>
              {sim.snap.enabled ? "Simulador de horarios activo" : "Simulador de horarios detenido"}
            </span>
            {!sim.snap.enabled && sim.canControl && <button className={btnPrimary} onClick={sim.start}>Activar para ver las alimentaciones</button>}
          </>
        )}
      </Card>

      <section aria-label="Calidad del agua" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ m, v, st }) => {
          const meta = WATER_METRICS[m], style = STATUS_STYLES[st];
          return (
            <div key={m} className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-4 shadow-sm" role="group" aria-label={`${meta.label}: ${v.toFixed(meta.decimals)} ${meta.unit}, ${style.label}`}>
              <div className="flex items-center justify-between text-label-sm font-label-sm text-secondary">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-base" aria-hidden="true">{meta.icon}</span>{meta.label}</span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${style.pill}`}>{style.label.toUpperCase()}</span>
              </div>
              <div className="my-3 flex items-baseline gap-2"><span className={`text-data-metric font-data-metric leading-none ${style.text}`}>{v.toFixed(meta.decimals)}</span><span className="text-label-md font-label-md text-secondary">{meta.unit}</span></div>
              <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden"><div className={`${style.bar} h-full rounded-full`} style={{ width: st === "ok" ? "100%" : st === "warn" ? "60%" : "30%" }}></div></div>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 p-5 space-y-4" aria-labelledby="h-chart">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
            <div><h2 id="h-chart" className="text-headline-sm font-headline-sm text-on-surface">Dispensación vs. respuesta de los peces · {pond}</h2><p className="text-body-sm font-body-sm text-secondary">Pase el cursor (o use ← →) para ver valores exactos.</p></div>
            <div className="flex items-center gap-3 text-label-sm font-label-sm">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-[#0D5C63]"></span>Dispensación (kg/h)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-[#D97706]"></span>Respuesta animal (%)</span>
            </div>
          </div>
          <LineChart ariaLabel={`Dispensación de alimento frente a la respuesta de los peces en ${pondName(pond)}`} labels={hist.labels} yFormat={(v) => v.toFixed(0)}
            series={[{ name: "Dispensación", color: "#0D5C63", values: hist.feed.map((v) => v * 5), fmt: (v) => `${(v / 5).toFixed(1)} kg/h` }, { name: "Respuesta", color: "#D97706", values: hist.response, dashed: true, fmt: (v) => `${v.toFixed(0)} %` }]} />
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-surface-container-high text-body-sm">
            <div><p className="text-label-sm font-label-sm text-secondary">Paquetes verificados</p><p className="font-bold text-[#065F46] font-mono">{counts[pond].ok}</p></div>
            <div><p className="text-label-sm font-label-sm text-secondary">Paquetes rechazados</p><p className={`font-bold font-mono ${counts[pond].rejected ? "text-error" : "text-on-surface"}`}>{counts[pond].rejected}</p></div>
            <div><p className="text-label-sm font-label-sm text-secondary">Sensor simulado</p><p className="font-semibold text-on-surface font-mono text-xs">{simId(pond)}</p></div>
          </div>
        </Card>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <Card className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-surface-container-high">
              <h2 className="text-label-lg font-label-lg text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary" aria-hidden="true">videocam</span>Cámara · {pond}</h2>
              <span className="px-2 py-0.5 rounded text-label-sm font-label-sm font-semibold bg-[#EEF2FF] text-[#3730A3] border border-[#C7D2FE]">SIMULACIÓN</span>
            </div>
            <div className="relative rounded-lg overflow-hidden bg-inverse-surface border border-outline-variant min-h-[200px] flex-1">
              <CameraSimulator key={pond} feeding={feeding} />
              <div className={`absolute top-2 left-2 right-2 text-[11px] px-2 py-1 rounded font-mono ${auto ? "bg-sky-700 text-white" : "bg-inverse-surface/80 text-inverse-on-surface"}`}>
                {auto ? <>ALIMENTACIÓN AUTOMÁTICA · {auto.name || auto.scheduleName} · {auto.doseKg} kg</> : manual ? "DOSIS MANUAL EN CURSO" : "ACTIVIDAD NORMAL"}
                {auto && <div className="mt-1 h-1.5 rounded bg-white/30 overflow-hidden"><div className="h-full bg-white transition-all duration-500" style={{ width: `${progress}%` }}></div></div>}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between gap-2">
              <div><p className="text-label-sm font-label-sm font-semibold text-on-surface">Micro-dosis adicional</p><p className="text-body-sm text-secondary">{tolva ? tolva.name : "Sin comedero"} · 250 g</p></div>
              <button onClick={dispense} disabled={!can("command") || !!manual} className="bg-[#D97706] hover:bg-[#b45309] text-white px-3 py-1.5 rounded-lg text-label-sm font-label-sm font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-base" aria-hidden="true">bolt</span>Dispensar
              </button>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5" aria-labelledby="h-api">
        <div className="flex items-center justify-between mb-3">
          <h2 id="h-api" className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary" aria-hidden="true">api</span>Lecturas recibidas por la API de sensores</h2>
          <span className="text-label-sm text-secondary">POST /api/v1/telemetry · tiempo real</span>
        </div>
        {apiQ.items.length === 0 ? <p className="text-sm text-secondary">Aún no llegan lecturas. Use <code className="font-mono">tools/sensor-simulator/simulate.mjs</code> o la colección Postman con la clave de un sensor registrado.</p> : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {apiQ.items.map((p) => { const st = STATUS_STYLES[p.status] || STATUS_STYLES.warn; return (
              <li key={p.id} className={`border rounded-lg p-3 bg-surface ${p.id === pond ? "border-primary border-2" : "border-surface-container-high"}`}>
                <div className="flex items-center justify-between"><span className="font-semibold text-sm">{p.id}</span><span className={`px-2 py-0.5 rounded border text-label-sm ${st.pill}`}>{st.label}</span></div>
                <dl className="grid grid-cols-4 gap-1 mt-2 text-center">{Object.entries(p.metrics || {}).map(([m, v]) => <div key={m}><dt className="text-[10px] text-secondary">{WATER_METRICS[m]?.label || m}</dt><dd className={`font-mono text-xs font-bold ${STATUS_STYLES[v.status]?.text}`}>{v.value}</dd></div>)}</dl>
                <p className="text-label-sm text-secondary mt-1">Actualizado: {p.updatedAtMs ? new Date(p.updatedAtMs).toLocaleTimeString("es", { hour12: false }) : "—"}</p>
              </li>); })}
          </ul>
        )}
        {apiForPond && <p className="text-label-sm text-secondary mt-2">{pond} ya recibe datos reales por la API.</p>}
      </Card>

      <Card className="p-4" aria-labelledby="h-sim">
        <h2 id="h-sim" className="text-label-lg font-label-lg text-on-surface mb-2">Herramientas de simulación · {pond}</h2>
        <div className="flex flex-wrap gap-2">
          <button className={btnOutline} onClick={() => { s.current.tamper[pond] = true; }}><span className="material-symbols-outlined text-base" aria-hidden="true">gpp_bad</span>Inyectar paquete falsificado</button>
          <button className={btnOutline} onClick={() => { s.current.lowUntil[pond] = Date.now() + 20000; }}><span className="material-symbols-outlined text-base" aria-hidden="true">air</span>Simular caída de oxígeno (20 s)</button>
          {sim.canControl && pondSchedules[0] && <button className={btnOutline} onClick={async () => { const r = await sim.runNow(pondSchedules[0]); setNotice({ tone: r.started ? "success" : "warn", text: r.started ? `Probando «${pondSchedules[0].name}»: mire la cámara.` : "Esa prueba ya se ejecutó hace un momento." }); }}><span className="material-symbols-outlined text-base" aria-hidden="true">play_circle</span>Probar horario ahora</button>}
        </div>
      </Card>

      <Card className="overflow-hidden" aria-labelledby="h-events">
        <div className="px-5 py-4 border-b border-surface-container-high bg-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary" aria-hidden="true">fact_check</span><h2 id="h-events" className="text-headline-sm font-headline-sm text-on-surface">Eventos en tiempo real · {pond}</h2></div>
        <ul aria-live="polite" className="divide-y divide-surface-container text-body-sm max-h-72 overflow-y-auto">
          {pondEvents.length === 0 && <li className="px-5 py-4 text-secondary">Esperando eventos…</li>}
          {pondEvents.map((e) => (
            <li key={e.id} className="px-5 py-2.5 flex items-center gap-3"><span className="font-mono text-secondary w-20 shrink-0">{e.time}</span><span className={`material-symbols-outlined text-base ${STATUS_STYLES[e.status].text}`} aria-hidden="true">{e.icon}</span><span className="text-on-surface">{e.text}</span></li>
          ))}
        </ul>
      </Card>
    </AppLayout>
  );
}
