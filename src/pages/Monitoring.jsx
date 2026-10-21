import React, { useEffect, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import AppLayout from "../components/AppLayout.jsx";
import CameraSimulator from "../components/CameraSimulator.jsx";
import LineChart from "../components/LineChart.jsx";
import { Banner, Card, PageHeader, btnOutline } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { sendCommand } from "../services/commands.js";
import { friendlyError } from "../utils/errors.js";
import { REJECT_REASONS, TelemetryVerifier, createSimulatedDevice } from "../utils/telemetry.js";
import { STATUS_STYLES, WATER_METRICS, statusFor } from "../utils/thresholds.js";

const DEVICE_ID = "SN-PROBE01";
const MAX_POINTS = 30;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const timeLabel = (d = new Date()) => d.toLocaleTimeString("es", { hour12: false });

function seed() {
  const labels = [], ph = [], oxygen = [], temperature = [], turbidity = [], feed = [], response = [];
  for (let i = MAX_POINTS - 1; i >= 0; i--) {
    labels.push(timeLabel(new Date(Date.now() - i * 3000)));
    ph.push(7.4); oxygen.push(7.8); temperature.push(14.2); turbidity.push(1.8);
    feed.push(10); response.push(55);
  }
  return { labels, ph, oxygen, temperature, turbidity, feed, response };
}

export default function Monitoring() {
  const { actor, can, audit } = useAuth();
  const [hist, setHist] = useState(seed);
  const [counts, setCounts] = useState({ ok: 0, rejected: 0 });
  const [events, setEvents] = useState([]);
  const [feeding, setFeeding] = useState(false);
  const [notice, setNotice] = useState(null);
  const [ready, setReady] = useState(false);
  const sim = useRef({ device: null, verifier: null, lowUntil: 0, feedUntil: 0, v: { ph: 7.4, oxygen: 7.8, temperature: 14.2, turbidity: 1.8 }, lastAlert: 0, tamperNext: false });

  const pushEvent = (e) => setEvents((ev) => [{ id: crypto.randomUUID(), time: timeLabel(), ...e }, ...ev].slice(0, 20));

  async function tick() {
    const s = sim.current;
    if (!s.device) return;
    const now = Date.now();
    const low = now < s.lowUntil;
    const walk = (cur, target, step, lo, hi) => clamp(cur + (target - cur) * 0.25 + (Math.random() - 0.5) * step, lo, hi);
    s.v = {
      ph: walk(s.v.ph, 7.4, 0.06, 6, 9),
      oxygen: walk(s.v.oxygen, low ? 4.4 : 7.8, 0.15, 2, 12),
      temperature: walk(s.v.temperature, 14.2, 0.12, 8, 24),
      turbidity: walk(s.v.turbidity, 1.8, 0.12, 0.2, 8),
    };
    const readings = Object.fromEntries(Object.entries(s.v).map(([k, v]) => [k, +v.toFixed(2)]));
    const tamper = s.tamperNext;
    s.tamperNext = false;
    const { packet, signature } = await s.device.emit(readings, { tamper });
    const res = await s.verifier.verify(packet, signature);

    if (!res.ok) {
      setCounts((c) => ({ ...c, rejected: c.rejected + 1 }));
      pushEvent({ status: "crit", icon: "gpp_bad", text: `Paquete rechazado de ${packet.deviceId}: ${REJECT_REASONS[res.reason]}` });
      audit("telemetry_rejected", packet.deviceId, { motivo: REJECT_REASONS[res.reason], pond: "AQ-04" }, "critical");
      return;
    }
    const r = res.packet.readings;
    setCounts((c) => ({ ...c, ok: c.ok + 1 }));
    const feedKg = now < s.feedUntil ? 18 + Math.random() * 2 : 9 + Math.random() * 2;
    const resp = clamp((now < s.feedUntil ? 82 : 55) + (Math.random() - 0.5) * 8, 0, 100);
    setHist((h) => {
      const add = (arr, v) => [...arr, v].slice(-MAX_POINTS);
      return { labels: add(h.labels, timeLabel()), ph: add(h.ph, r.ph), oxygen: add(h.oxygen, r.oxygen), temperature: add(h.temperature, r.temperature), turbidity: add(h.turbidity, r.turbidity), feed: add(h.feed, feedKg), response: add(h.response, resp) };
    });

    // Alerta crítica persistente (con antirrebote de 60 s).
    if (statusFor("oxygen", r.oxygen) === "crit") {
      pushEvent({ status: "crit", icon: "error", text: `Oxígeno disuelto crítico: ${r.oxygen} mg/L` });
      const a = actor();
      if (a && can("command") && now - s.lastAlert > 60_000) {
        s.lastAlert = now;
        addDoc(collection(db, "alerts"), { severity: "critical", metric: "oxygen", value: r.oxygen, pond: "AQ-04", message: `Oxígeno disuelto bajo el umbral crítico (${r.oxygen} mg/L)`, uid: a.uid, ts: serverTimestamp() }).catch(() => {});
      }
    }
  }

  useEffect(() => {
    let alive = true, timer;
    (async () => {
      const device = await createSimulatedDevice(DEVICE_ID);
      const verifier = new TelemetryVerifier();
      await verifier.registerDevice(DEVICE_ID, device.publicJwk); // solo clave PÚBLICA
      if (!alive) return;
      sim.current.device = device;
      sim.current.verifier = verifier;
      setReady(true);
      pushEvent({ status: "ok", icon: "verified", text: `Dispositivo ${DEVICE_ID} registrado: telemetría firmada (ECDSA P-256)` });
      timer = setInterval(tick, 3000);
      tick();
    })();
    return () => { alive = false; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function dispense() {
    setNotice(null);
    try {
      await sendCommand({ actor: actor(), command: { type: "dispense_manual", deviceId: "SN-AQ8832", pondId: "AQ-04", amountG: 250 } });
      sim.current.feedUntil = Date.now() + 9000;
      setFeeding(true);
      setTimeout(() => setFeeding(false), 9000);
      pushEvent({ status: "ok", icon: "bolt", text: "Micro-dosis manual de 250 g enviada" });
    } catch (e) {
      setNotice({ tone: "error", text: friendlyError(e) });
    }
  }

  const last = (k) => hist[k][hist[k].length - 1];
  const kpis = ["ph", "oxygen", "temperature", "turbidity"].map((m) => ({ m, v: last(m), st: statusFor(m, last(m)) }));

  return (
    <AppLayout active="monitoreo">
      <PageHeader
        eyebrow={<span className="px-2 py-0.5 rounded font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>{ready ? "Telemetría firmada activa" : "Iniciando…"}</span>}
        title="Monitoreo de Telemetría y Consumo en Tiempo Real"
        subtitle="Estanque AQ-04 · Trucha Arcoíris. Solo se aceptan paquetes con firma válida de dispositivos registrados."
      />
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}

      <section aria-label="Calidad del agua" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ m, v, st }) => {
          const meta = WATER_METRICS[m], style = STATUS_STYLES[st];
          return (
            <div key={m} className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-4 shadow-sm" role="group" aria-label={`${meta.label}: ${v.toFixed(meta.decimals)} ${meta.unit}, ${style.label}`}>
              <div className="flex items-center justify-between text-label-sm font-label-sm text-secondary">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-base" aria-hidden="true">{meta.icon}</span>{meta.label}</span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${style.pill}`}>{style.label.toUpperCase()}</span>
              </div>
              <div className="my-3 flex items-baseline gap-2">
                <span className={`text-data-metric font-data-metric leading-none ${style.text}`}>{v.toFixed(meta.decimals)}</span>
                <span className="text-label-md font-label-md text-secondary">{meta.unit}</span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden"><div className={`${style.bar} h-full rounded-full`} style={{ width: st === "ok" ? "100%" : st === "warn" ? "60%" : "30%" }}></div></div>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 p-5 space-y-4" aria-labelledby="h-chart">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
            <div>
              <h2 id="h-chart" className="text-headline-sm font-headline-sm text-on-surface">Dispensación vs. respuesta de los peces</h2>
              <p className="text-body-sm font-body-sm text-secondary">Pase el cursor (o use ← →) para ver valores exactos.</p>
            </div>
            <div className="flex items-center gap-3 text-label-sm font-label-sm">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-[#0D5C63]"></span>Dispensación (kg/h)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-[#D97706]"></span>Respuesta animal (%)</span>
            </div>
          </div>
          <LineChart
            ariaLabel="Gráfica de dispensación de alimento frente a la respuesta de los peces"
            labels={hist.labels}
            yFormat={(v) => v.toFixed(0)}
            series={[
              { name: "Dispensación", color: "#0D5C63", values: hist.feed.map((v) => v * 5), fmt: (v) => `${(v / 5).toFixed(1)} kg/h` },
              { name: "Respuesta", color: "#D97706", values: hist.response, dashed: true, fmt: (v) => `${v.toFixed(0)} %` },
            ]}
          />
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-surface-container-high text-body-sm">
            <div><p className="text-label-sm font-label-sm text-secondary">Paquetes verificados</p><p className="font-bold text-[#065F46] font-mono">{counts.ok}</p></div>
            <div><p className="text-label-sm font-label-sm text-secondary">Paquetes rechazados</p><p className={`font-bold font-mono ${counts.rejected ? "text-error" : "text-on-surface"}`}>{counts.rejected}</p></div>
            <div><p className="text-label-sm font-label-sm text-secondary">Algoritmo de firma</p><p className="font-semibold text-on-surface">ECDSA P-256</p></div>
          </div>
        </Card>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <Card className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-surface-container-high">
              <h2 className="text-label-lg font-label-lg text-on-surface flex items-center gap-2"><span className="material-symbols-outlined text-primary" aria-hidden="true">videocam</span>Cámara submarina 01</h2>
              <span className="px-2 py-0.5 rounded text-label-sm font-label-sm font-semibold bg-[#EEF2FF] text-[#3730A3] border border-[#C7D2FE]">SIMULACIÓN</span>
            </div>
            <div className="relative rounded-lg overflow-hidden bg-inverse-surface border border-outline-variant min-h-[180px] flex-1">
              <CameraSimulator feeding={feeding} />
              <div className="absolute top-2 left-2 bg-inverse-surface/80 text-inverse-on-surface text-[11px] px-2 py-0.5 rounded font-mono">{feeding ? "INGESTA ACTIVA" : "ACTIVIDAD NORMAL"}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between">
              <div><p className="text-label-sm font-label-sm font-semibold text-on-surface">Micro-dosis adicional</p><p className="text-body-sm text-secondary">Pulso manual 250 g</p></div>
              <button onClick={dispense} disabled={!can("command")} className="bg-[#D97706] hover:bg-[#b45309] text-white px-3 py-1.5 rounded-lg text-label-sm font-label-sm font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-base" aria-hidden="true">bolt</span>Dispensar
              </button>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4" aria-labelledby="h-sim">
        <h2 id="h-sim" className="text-label-lg font-label-lg text-on-surface mb-2">Herramientas de simulación (demostración de seguridad)</h2>
        <div className="flex flex-wrap gap-2">
          <button className={btnOutline} onClick={() => { sim.current.tamperNext = true; }}>
            <span className="material-symbols-outlined text-base" aria-hidden="true">gpp_bad</span>Inyectar paquete falsificado
          </button>
          <button className={btnOutline} onClick={() => { sim.current.lowUntil = Date.now() + 20000; }}>
            <span className="material-symbols-outlined text-base" aria-hidden="true">air</span>Simular caída de oxígeno (20 s)
          </button>
        </div>
      </Card>

      <Card className="overflow-hidden" aria-labelledby="h-events">
        <div className="px-5 py-4 border-b border-surface-container-high bg-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">fact_check</span>
          <h2 id="h-events" className="text-headline-sm font-headline-sm text-on-surface">Registro de eventos críticos en tiempo real</h2>
        </div>
        <ul aria-live="polite" className="divide-y divide-surface-container text-body-sm max-h-72 overflow-y-auto">
          {events.length === 0 && <li className="px-5 py-4 text-secondary">Esperando eventos…</li>}
          {events.map((e) => (
            <li key={e.id} className="px-5 py-2.5 flex items-center gap-3">
              <span className="font-mono text-secondary w-20 shrink-0">{e.time}</span>
              <span className={`material-symbols-outlined text-base ${STATUS_STYLES[e.status].text}`} aria-hidden="true">{e.icon}</span>
              <span className="text-on-surface">{e.text}</span>
            </li>
          ))}
        </ul>
      </Card>
    </AppLayout>
  );
}
