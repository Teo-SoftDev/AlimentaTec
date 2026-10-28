import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TapTwiceButton from "../components/TapTwiceButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useCollection } from "../hooks/useCollection.js";
import { useSimulator } from "../simulator/SimulatorContext.jsx";
import { nextOccurrence } from "../simulator/occurrences.js";
import { sendCommand } from "../services/commands.js";
import { PONDS } from "../utils/constants.js";
import { DEMO_DEVICES, DEMO_SCHEDULES, POND_READINGS } from "../utils/demoData.js";
import { friendlyError } from "../utils/errors.js";
import { DEVICE_WORDS, SEMAPHORE, describeMetric, fmtClock, guidanceFor, inWords, summarizePond } from "../utils/plainLanguage.js";

const PORTION_G = 250;
const STALE_MS = 10 * 60_000;
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; };

function Semaphore({ status, size = 72 }) {
  const s = SEMAPHORE[status];
  return (
    <span className={`shrink-0 rounded-full flex items-center justify-center ${s.solid}`} style={{ width: size, height: size }} aria-hidden="true">
      <span className="material-symbols-outlined" style={{ fontSize: size * 0.62 }}>{s.icon}</span>
    </span>
  );
}

export default function Caretaker() {
  const { user, role, actor, can, cerrarSesion } = useAuth();
  const { toast } = useToast();
  const sim = useSimulator();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState({});
  const [paused, setPaused] = useState({});

  const pondQ = useCollection("pondStatus", { limitN: 20 });
  const devicesQ = useCollection("devices", { limitN: 200, fallback: DEMO_DEVICES });
  const schedulesQ = useCollection("schedules", { limitN: 200, fallback: DEMO_SCHEDULES });
  const alertsQ = useCollection("alerts", { orderByField: "ts", direction: "desc", limitN: 10 });

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);

  // Avisos: cada alerta NUEVA se convierte en un aviso grande con pasos ilustrados.
  const seen = useRef(null);
  useEffect(() => {
    if (alertsQ.loading) return;
    if (seen.current === null) { seen.current = new Set(alertsQ.items.map((a) => a.id)); return; }
    for (const a of alertsQ.items) {
      if (seen.current.has(a.id)) continue;
      seen.current.add(a.id);
      const crit = a.severity === "critical";
      const g = guidanceFor(a.metric, crit ? "crit" : "warn", a.pond ? PONDS.find((p) => p.id === a.pond)?.name || a.pond : "su estanque");
      const d = Number.isFinite(a.value) && ["oxygen", "temperature", "ph", "waterLevel"].includes(a.metric) ? describeMetric(a.metric, a.value) : null;
      toast({ tone: crit ? "crit" : "warn", title: g.title, message: d ? `${d.name}: ${d.word}.` : a.message, steps: g.steps, key: `alert-${a.id}` });
    }
  }, [alertsQ.items, alertsQ.loading, toast]);

  const ponds = useMemo(() => {
    const real = new Map(pondQ.items.map((p) => [p.id, p]));
    return PONDS.map((p) => {
      const rt = real.get(p.id);
      const readings = rt ? Object.fromEntries(Object.entries(rt.metrics || {}).map(([m, v]) => [m, v.value])) : POND_READINGS[p.id];
      const stale = rt ? now - (rt.updatedAtMs || 0) > STALE_MS : false;
      const sensor = devicesQ.items.find((d) => d.type === "sensor" && d.pondId === p.id);
      const tolva = devicesQ.items.find((d) => d.type === "tolva" && d.pondId === p.id && d.status !== "revoked");
      const summary = summarizePond(readings);
      const running = sim.snap.running.find((r) => r.pondId === p.id) || sim.events.find((e) => e.pondId === p.id && e.status === "running" && now - (e.executedAtMs || 0) < 120_000);
      const next = nextOccurrence(schedulesQ.items.filter((s) => s.enabled), now, p.id);
      return { ...p, readings, summary: stale ? { ...summary, status: summary.status === "ok" ? "warn" : summary.status, headline: "Sin datos recientes del agua" } : summary, live: !!rt, stale, sensorStatus: sensor ? sensor.status : "none", tolva, running, next };
    });
  }, [pondQ.items, devicesQ.items, schedulesQ.items, sim.snap.running, sim.events, now]);

  const worst = ponds.some((p) => p.summary.status === "crit") ? "crit" : ponds.some((p) => p.summary.status === "warn") ? "warn" : "ok";
  const needAttention = ponds.filter((p) => p.summary.status !== "ok").length;

  async function run(key, fn, okTitle, okMsg) {
    setBusy((b) => ({ ...b, [key]: true }));
    try { await fn(); toast({ tone: "ok", title: okTitle, message: okMsg, duration: 6000 }); }
    catch (e) { toast({ tone: "crit", title: "No se pudo completar", message: friendlyError(e), steps: [{ icon: "refresh", text: "Intente de nuevo en un momento" }, { icon: "call", text: "Si sigue igual, avise al supervisor" }] }); }
    finally { setBusy((b) => ({ ...b, [key]: false })); }
  }

  const feed = (p) => run(`feed-${p.id}`, () => sendCommand({ actor: actor(), command: { type: "dispense_manual", deviceId: p.tolva.serial, pondId: p.id, amountG: PORTION_G } }), "Alimentación lista", `Se está dando de comer en ${p.name} (${PORTION_G} g).`);
  const togglePause = (p) => {
    const isPaused = paused[p.id] ?? p.tolva?.autoFeeding === false;
    return run(`pause-${p.id}`, async () => { await sendCommand({ actor: actor(), command: { type: "toggle_auto", deviceId: p.tolva.serial, pondId: p.id, enabled: isPaused } }); setPaused((s) => ({ ...s, [p.id]: !isPaused })); },
      isPaused ? "Alimentación reanudada" : "Alimentación en pausa", isPaused ? `${p.name} volverá a comer a sus horas.` : `${p.name} no comerá hasta que la reanude.`);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface text-lg">
      <header className="sticky top-0 z-30 bg-white border-b-2 border-surface-container-high shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-primary truncate">{greeting()}, {(user?.displayName || "cuidador").split(" ")[0]}</p>
            <p className="text-base text-secondary">{new Date(now).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })} · {fmtClock(new Date(now))}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {can("advanced:view") && <Link to="/dashboard" className="min-h-[52px] px-4 inline-flex items-center rounded-xl border-2 border-outline-variant font-bold text-base hover:bg-surface-container">Vista completa</Link>}
            <button onClick={async () => { await cerrarSesion("manual"); navigate("/"); }} className="min-h-[52px] px-4 inline-flex items-center gap-2 rounded-xl border-2 border-outline-variant font-bold text-base hover:bg-surface-container" aria-label="Cerrar sesión">
              <span className="material-symbols-outlined" aria-hidden="true">logout</span><span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5 pb-16">
        <section aria-live="polite" className={`rounded-3xl border-4 p-5 flex items-center gap-4 ${SEMAPHORE[worst].soft}`}>
          <Semaphore status={worst} size={88} />
          <div>
            <h1 className="text-3xl font-extrabold leading-tight">{worst === "ok" ? "Todo está en orden" : worst === "warn" ? "Hay que revisar algo pronto" : "¡Hay que actuar ahora!"}</h1>
            <p className="text-xl mt-1">{worst === "ok" ? "Todos los estanques están bien." : `${needAttention} estanque${needAttention > 1 ? "s necesitan" : " necesita"} su atención.`}</p>
          </div>
        </section>

        <ul className="flex flex-wrap gap-3 text-base font-semibold" aria-label="Significado de los colores">
          {["ok", "warn", "crit"].map((k) => <li key={k} className="flex items-center gap-2"><span className={`w-5 h-5 rounded-full ${SEMAPHORE[k].solid}`}></span>{k === "ok" ? "Verde: todo bien" : k === "warn" ? "Amarillo: precaución" : "Rojo: actúe ahora"}</li>)}
        </ul>

        {(pondQ.error || devicesQ.error) && <div role="alert" className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-lg font-semibold">No pudimos actualizar los datos. Revise su conexión a internet.</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {ponds.map((p) => {
            const st = SEMAPHORE[p.summary.status];
            const isPaused = paused[p.id] ?? p.tolva?.autoFeeding === false;
            const disabled = !p.tolva || !can("command");
            return (
              <article key={p.id} className={`rounded-3xl border-4 bg-white overflow-hidden shadow-md ${p.summary.status === "ok" ? "border-green-300" : p.summary.status === "warn" ? "border-amber-400" : "border-red-500"}`}>
                <div className={`flex items-center gap-4 p-4 ${st.solid}`}>
                  <span className="w-[72px] h-[72px] rounded-full bg-white/25 flex items-center justify-center" aria-hidden="true"><span className="material-symbols-outlined" style={{ fontSize: 50 }}>{st.icon}</span></span>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-extrabold leading-tight">{p.name}</h2>
                    <p className="text-xl font-bold leading-snug">{p.summary.headline}</p>
                    <p className="text-base opacity-90">{p.species}</p>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <ul className="grid grid-cols-2 gap-2">
                    {p.summary.parts.map((m) => (
                      <li key={m.metric} className={`rounded-xl border-2 p-2.5 flex items-center gap-2 ${SEMAPHORE[m.status].soft}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 30 }} aria-hidden="true">{m.icon}</span>
                        <div className="leading-tight"><div className="text-sm font-semibold">{m.name}</div><div className="text-lg font-extrabold">{m.word}</div></div>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2 text-base font-semibold">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 border-2 ${p.sensorStatus === "online" ? "bg-green-50 border-green-300 text-green-900" : p.sensorStatus === "none" ? "bg-surface-container border-outline-variant" : "bg-amber-50 border-amber-400 text-amber-950"}`}>
                      <span className="material-symbols-outlined" aria-hidden="true">{p.sensorStatus === "online" ? "wifi" : "wifi_off"}</span>Sensor: {DEVICE_WORDS[p.sensorStatus] || "Sin sensor"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border-2 bg-surface-container-low border-outline-variant">
                      <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                      {isPaused ? "Alimentación en pausa" : p.next ? `Próxima comida: ${p.next.time} (${inWords(p.next.atMs - now)})` : "Sin comidas programadas"}
                    </span>
                    {!p.live && <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border-2 bg-secondary-container/50 border-outline-variant"><span className="material-symbols-outlined" aria-hidden="true">science</span>Datos de ejemplo</span>}
                  </div>

                  {p.running && (
                    <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 p-3" role="status">
                      <p className="text-lg font-extrabold text-sky-900 flex items-center gap-2"><span className="material-symbols-outlined animate-pulse" aria-hidden="true">restaurant</span>Dando de comer ahora…</p>
                      <div className="mt-2 h-4 rounded-full bg-white border border-sky-300 overflow-hidden"><div className="h-full bg-sky-600 transition-all duration-700" style={{ width: `${p.running.progress ?? 30}%` }}></div></div>
                    </div>
                  )}

                  {disabled && <p className="text-base font-semibold text-secondary">{!p.tolva ? "Este estanque aún no tiene comedero registrado." : "Su usuario no puede dar órdenes al comedero."}</p>}
                  <TapTwiceButton icon="restaurant" label="Dar de comer ahora" tone="green" disabled={disabled || p.summary.status === "crit"} busy={!!busy[`feed-${p.id}`]} onConfirm={() => feed(p)} hint={p.summary.status === "crit" ? "Bloqueado: con el agua en mal estado no se debe dar de comer." : `Una porción de ${PORTION_G} gramos. Toque dos veces.`} />
                  <TapTwiceButton icon={isPaused ? "play_arrow" : "pause_circle"} label={isPaused ? "Reanudar alimentación" : "Pausar alimentación"} tone={isPaused ? "blue" : "gray"} disabled={disabled} busy={!!busy[`pause-${p.id}`]} onConfirm={() => togglePause(p)} hint={isPaused ? "El comedero volverá a funcionar a sus horas." : "El comedero dejará de dar comida hasta que usted lo reanude."} />
                </div>
              </article>
            );
          })}
        </div>

        <p className="text-center text-base text-secondary">¿Algo no está claro? Avise a su supervisor. Rol: {role === "cuidador" ? "Cuidador" : role}.</p>
      </main>
    </div>
  );
}
