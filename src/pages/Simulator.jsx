import React, { useMemo } from "react";
import AppLayout from "../components/AppLayout.jsx";
import PillToggle from "../components/PillToggle.jsx";
import { Banner, Card, DemoBadge, KpiCard, PageHeader, btnOutline, btnPrimary, inputCls } from "../components/ui.jsx";
import { useSimulator } from "../simulator/SimulatorContext.jsx";
import { occurrencesBetween } from "../simulator/occurrences.js";
import { pondName } from "../utils/constants.js";

const STATUS = {
  running: { label: "En curso", cls: "bg-sky-50 text-sky-900 border-sky-300", icon: "autorenew" },
  completed: { label: "Completada", cls: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]", icon: "check_circle" },
  skipped: { label: "Omitida", cls: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]", icon: "block" },
};
const SPEEDS = [[1, "Tiempo real"], [60, "x60 (1 hora por minuto)"], [720, "x720 (un día en 2 min)"]];
const fmt = (ms) => (ms ? new Date(ms).toLocaleString("es", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "—");

export default function Simulator() {
  const sim = useSimulator();
  const { snap, events, hostState, canControl } = sim;
  const beatAge = hostState?.lastBeatMs ? Date.now() - hostState.lastBeatMs : Infinity;
  const remoteActive = !snap.enabled && hostState?.enabled && beatAge < 20_000;

  const upcoming = useMemo(
    () => occurrencesBetween(sim.schedules.filter((s) => s.enabled), snap.virtualNow, snap.virtualNow + 24 * 3600_000, { prefix: snap.speed > 1 ? "x" : "" }).slice(0, 6),
    [sim.schedules, snap.virtualNow, snap.speed]
  );
  const runningNow = snap.enabled ? snap.running : events.filter((e) => e.status === "running" && Date.now() - (e.executedAtMs || 0) < 120_000).map((e) => ({ id: e.id, pondId: e.pondId, name: e.scheduleName, doseKg: e.doseKg, progress: e.progress || 0 }));

  return (
    <AppLayout active="simulador" searchPlaceholder="Buscar en el historial…">
      <PageHeader
        eyebrow={<><span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]" aria-hidden="true">memory</span> Motor de eventos temporales</span><DemoBadge show={sim.schedulesDemo && canControl} /></>}
        title="Simulador de Alimentación Programada"
        subtitle="Evalúa los horarios guardados y ejecuta las tolvas sin intervención manual. Cada evento queda en el Historial."
        actions={canControl ? (snap.enabled
          ? <button className={btnOutline} onClick={sim.stop}><span className="material-symbols-outlined text-base" aria-hidden="true">stop_circle</span>Detener simulador</button>
          : <button className={btnPrimary} onClick={sim.start}><span className="material-symbols-outlined text-base" aria-hidden="true">play_circle</span>Iniciar simulador</button>) : null}
      />

      {!canControl && <Banner tone="info" icon="visibility">Modo solo lectura: puede ver la actividad, pero solo Administradores y Operadores controlan el simulador.</Banner>}
      {remoteActive && <Banner tone="success" icon="cloud_sync">El simulador está activo en otro equipo ({hostState.hostEmail || "operador"}). Lo que ve aquí se sincroniza en tiempo real.</Banner>}
      {snap.enabled && !snap.online && <Banner tone="warn" icon="wifi_off"><strong>Sin conexión (simulada).</strong> {snap.behavior === "local" ? "Las tolvas siguen ejecutando con su reloj interno y los eventos se guardan en este equipo." : "Las alimentaciones quedan en espera y se ejecutarán en cascada al reconectar."} Pendientes: {snap.outbox} por sincronizar, {snap.deferred} en espera.</Banner>}
      {snap.speed > 1 && <Banner tone="warn" icon="fast_forward">Reloj acelerado: los eventos se marcan como <strong>simulados</strong> y no afectan a los horarios reales del día.</Banner>}

      <section aria-label="Resumen" className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Estado" icon="memory" value={snap.enabled ? (snap.online ? "Activo" : "Offline") : remoteActive ? "Remoto" : "Detenido"} valueClass="text-xl" iconClass={snap.enabled && snap.online ? "text-primary" : "text-amber-600"} />
        <KpiCard label="Ejecutadas" icon="restaurant" value={snap.stats.executed} barPct={Math.min(100, snap.stats.executed * 10)} />
        <KpiCard label="Omitidas por seguridad" icon="block" iconClass="text-amber-600" value={snap.stats.skipped} barPct={Math.min(100, snap.stats.skipped * 20)} barClass="bg-amber-500" />
        <KpiCard label="Recuperadas tarde" icon="history_toggle_off" value={snap.stats.late} barPct={Math.min(100, snap.stats.late * 20)} />
        <KpiCard label="Duplicados evitados" icon="verified" value={snap.stats.duplicatesAvoided} hint="Misma porción nunca se repite" />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-5 p-5 space-y-4" aria-labelledby="h-ctl">
          <h2 id="h-ctl" className="text-headline-sm font-headline-sm text-on-surface">Controles</h2>
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-container-low border border-surface-container-high">
            <div><div className="text-label-lg font-label-lg">Simular pérdida de conexión</div><div className="text-body-sm text-secondary">Prueba el modo offline y la sincronización posterior.</div></div>
            <PillToggle label="Simular pérdida de conexión" checked={!sim.simOnline} onChange={(off) => sim.setSimOnline(!off)} disabled={!canControl} />
          </div>
          <label className="block text-label-lg font-label-lg">Al perder la conexión
            <select className={`${inputCls} mt-1`} value={snap.behavior} onChange={(e) => sim.setBehavior(e.target.value)} disabled={!canControl}>
              <option value="local">La tolva ejecuta sola y sincroniza después</option>
              <option value="defer">Esperar y ejecutar en cascada al reconectar</option>
            </select>
          </label>
          <label className="block text-label-lg font-label-lg">Velocidad del reloj
            <select className={`${inputCls} mt-1`} value={snap.speed} onChange={(e) => sim.setSpeed(+e.target.value)} disabled={!canControl}>
              {SPEEDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <p className="text-label-sm text-secondary">Reloj del simulador: {fmt(snap.virtualNow)} · Último ciclo: {fmt(snap.lastTickMs)}</p>

          <div>
            <h3 className="text-label-lg font-label-lg mb-2">Tolvas en ejecución</h3>
            {runningNow.length === 0 ? <p className="text-sm text-secondary">Ninguna tolva está dispensando ahora.</p> : (
              <ul className="space-y-2" aria-live="polite">
                {runningNow.map((r) => (
                  <li key={r.id} className="p-3 rounded-lg border border-sky-300 bg-sky-50">
                    <div className="flex justify-between text-sm font-semibold text-sky-900"><span>{pondName(r.pondId)} · {r.name}</span><span>{r.doseKg} kg</span></div>
                    <div className="mt-2 h-2.5 rounded-full bg-white border border-sky-200 overflow-hidden"><div className="h-full bg-sky-600 transition-all duration-500" style={{ width: `${r.progress}%` }}></div></div>
                    {r.offline && <p className="text-label-sm text-amber-800 mt-1">Ejecutando sin conexión</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-label-lg font-label-lg mb-2">Próximas 24 h</h3>
            <ul className="space-y-1.5 text-body-sm">
              {upcoming.length === 0 && <li className="text-secondary">No hay disparos programados.</li>}
              {upcoming.map((o) => <li key={o.id} className="flex justify-between border-b border-surface-container py-1"><span className="font-mono font-semibold text-primary">{new Date(o.atMs).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false })}</span><span>{pondName(o.pondId)} · {o.scheduleName}</span><span className="font-mono">{o.doseKg} kg</span></li>)}
            </ul>
          </div>
        </Card>

        <Card className="xl:col-span-7 overflow-hidden" aria-labelledby="h-ev">
          <div className="px-5 py-4 border-b border-surface-container flex items-center justify-between">
            <h2 id="h-ev" className="text-headline-sm font-headline-sm text-on-surface">Eventos en tiempo real</h2>
            <span className="text-label-sm text-secondary">{events.length} recientes · sincronizados por Firestore</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <caption className="sr-only">Eventos de alimentación automática</caption>
              <thead><tr className="bg-surface-container-low text-secondary text-label-sm uppercase tracking-wider"><th className="py-3 px-4">Hora</th><th className="px-4">Horario</th><th className="px-4">Estanque</th><th className="px-4 text-right">Dosis</th><th className="px-4">Estado</th><th className="px-4">Observaciones</th></tr></thead>
              <tbody className="divide-y divide-surface-container">
                {events.length === 0 && <tr><td colSpan={6} className="p-6 text-secondary">Aún no hay eventos. Inicie el simulador y espere a un horario programado (o use el reloj acelerado).</td></tr>}
                {events.map((e) => {
                  const st = STATUS[e.status] || STATUS.completed;
                  return (
                    <tr key={e.id}>
                      <td className="py-2.5 px-4 font-mono text-xs whitespace-nowrap">{fmt(e.executedAtMs)}</td>
                      <td className="px-4 font-medium">{e.scheduleName}</td>
                      <td className="px-4">{e.pondId}</td>
                      <td className="px-4 text-right font-mono">{e.doseKg} kg{e.plannedKg !== e.doseKg ? <span className="text-secondary"> (prog. {e.plannedKg})</span> : null}</td>
                      <td className="px-4"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${st.cls}`}><span className="material-symbols-outlined text-[14px]" aria-hidden="true">{st.icon}</span>{st.label}</span></td>
                      <td className="px-4 text-xs text-secondary space-x-1">
                        {e.late && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">Recuperada (+{e.delayMin} min)</span>}
                        {e.offlineExecuted && <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">Sin conexión</span>}
                        {e.simulated && <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900">Reloj acelerado</span>}
                        {e.reason && <span>{e.reason}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
