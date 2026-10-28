import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { Banner, Card, DemoBadge, KpiCard, PageHeader } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { toDate, useCollection } from "../hooks/useCollection.js";
import { DEMO_ALERTS, DEMO_BATCHES, DEMO_DEVICES, POND_READINGS } from "../utils/demoData.js";
import { PONDS, pondName } from "../utils/constants.js";
import { STATUS_STYLES, statusFor, worstStatus } from "../utils/thresholds.js";

const feedRatePct = (g) => (g < 5 ? 6 : g < 20 ? 4 : g < 100 ? 2.8 : g < 300 ? 2 : 1.4);

export default function Dashboard() {
  const { user, role, can } = useAuth();
  const batches = useCollection("batches", { limitN: 200, fallback: DEMO_BATCHES });
  const devices = useCollection("devices", { limitN: 200, fallback: DEMO_DEVICES });
  const alerts = useCollection("alerts", { orderByField: "ts", direction: "desc", limitN: 20, fallback: DEMO_ALERTS });
  const pondQ = useCollection("pondStatus", { limitN: 20 });
  const secAlerts = useCollection("securityAlerts", { orderByField: "ts", direction: "desc", limitN: 5, enabled: can("security:view") });

  const stats = useMemo(() => {
    const biomass = batches.items.reduce((s, b) => s + ((b.population || 0) * (b.avgWeightG || 0)) / 1000, 0);
    const dailyFeed = batches.items.reduce((s, b) => s + (((b.population || 0) * (b.avgWeightG || 0)) / 1000) * (feedRatePct(b.avgWeightG || 0) / 100), 0);
    const real = new Map(pondQ.items.map((x) => [x.id, x]));
    const tanks = PONDS.map((p) => {
      const rt = real.get(p.id);
      const r = rt ? Object.fromEntries(Object.entries(rt.metrics || {}).map(([m, v]) => [m, v.value])) : POND_READINGS[p.id];
      return { ...p, live: !!rt, readings: r, status: worstStatus(Object.entries(r).map(([m, v]) => statusFor(m, v))) };
    });
    const dev = devices.items.filter((d) => d.status !== "revoked");
    return { biomass, dailyFeed, tanks, online: dev.filter((d) => d.status === "online").length, totalDev: dev.length };
  }, [batches.items, devices.items, pondQ.items]);

  const critical = alerts.items.filter((a) => a.severity === "critical" || a.severity === "warning");
  const okTanks = stats.tanks.filter((t) => t.status === "ok").length;
  const loadError = batches.error || devices.error || alerts.error;

  return (
    <AppLayout active="dashboard">
      <PageHeader
        eyebrow={<><span>Bienvenido/a, {user?.displayName || "operador"}</span><DemoBadge show={batches.isDemo || devices.isDemo} /></>}
        title="Resumen Ejecutivo de la Granja Acuícola"
        subtitle="Estado general de biomasa, consumo de alimento, estanques y dispositivos."
      />

      {user && !user.emailVerified && <Banner tone="info" icon="mark_email_unread">Su correo aún no está verificado. Revise su bandeja de entrada para completar la verificación.</Banner>}
      {loadError && <Banner tone="warn">{loadError}</Banner>}

      <section aria-label="Indicadores clave" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Biomasa total" icon="set_meal" value={(stats.biomass / 1000).toFixed(1)} unit="toneladas" hint={`${batches.items.length} lote(s) activos`} barPct={70} />
        <KpiCard label="Consumo diario de alimento" icon="scale" value={stats.dailyFeed.toFixed(0)} unit="kg/día" hint="Estimado por tasa de alimentación" barPct={62} barClass="bg-primary-container" />
        <KpiCard label="Estado de estanques" icon="water" value={`${okTanks}/${stats.tanks.length}`} unit="óptimos" iconClass={okTanks === stats.tanks.length ? "text-primary" : "text-amber-600"} barPct={(okTanks / stats.tanks.length) * 100} barClass={okTanks === stats.tanks.length ? "bg-primary" : "bg-amber-500"} />
        <KpiCard label="Dispositivos activos" icon="devices" value={`${stats.online}/${stats.totalDev}`} unit="en línea" barPct={stats.totalDev ? (stats.online / stats.totalDev) * 100 : 0} barClass="bg-primary-container" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-5" aria-labelledby="h-ponds">
          <div className="flex items-center justify-between mb-4"><h2 id="h-ponds" className="text-headline-sm font-headline-sm text-on-surface">Estado por estanque</h2><DemoBadge show={!pondQ.items.length} /></div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.tanks.map((t) => {
              const st = STATUS_STYLES[t.status];
              return (
                <li key={t.id} className="border border-surface-container-high rounded-lg p-3 bg-surface">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-on-surface text-sm">{t.name}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-label-sm font-label-sm ${st.pill}`}>
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{st.icon}</span>{st.label}
                    </span>
                  </div>
                  <p className="text-label-sm font-label-sm text-secondary">{t.species}</p>
                  <dl className="grid grid-cols-4 gap-1 mt-2 text-center">
                    {[["O₂", t.readings.oxygen, "oxygen"], ["T°", t.readings.temperature, "temperature"], ["pH", t.readings.ph, "ph"], ["Nivel", t.readings.waterLevel, "waterLevel"]].map(([l, v, m]) => (
                      <div key={l}><dt className="text-[10px] text-secondary">{l}</dt><dd className={`font-mono text-xs font-bold ${v === undefined ? "text-secondary" : STATUS_STYLES[statusFor(m, v)].text}`}>{v ?? "—"}</dd></div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
          <p className="text-label-sm font-label-sm text-secondary mt-3">{stats.tanks.some((t) => t.live) ? "Lecturas recibidas por la API de sensores (tiempo real). " : "Lecturas de referencia: aún no llegan datos de la API. "}Detalle en <Link to="/monitoreo" className="text-primary font-semibold hover:underline">Monitoreo</Link>.</p>
        </Card>

        <Card className="lg:col-span-5 p-5" aria-labelledby="h-alerts">
          <div className="flex items-center justify-between mb-4">
            <h2 id="h-alerts" className="text-headline-sm font-headline-sm text-on-surface">Alertas en tiempo real</h2>
            <DemoBadge show={alerts.isDemo} />
          </div>
          <ul aria-live="polite" className="space-y-2">
            {critical.length === 0 && <li className="text-sm text-secondary">Sin alertas activas. Todo en orden.</li>}
            {critical.slice(0, 6).map((a) => (
              <li key={a.id} className={`flex gap-2 p-2.5 rounded border text-sm ${a.severity === "critical" ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60"}`}>
                <span className={`material-symbols-outlined text-lg ${a.severity === "critical" ? "text-error" : "text-amber-600"}`} aria-hidden="true">{a.severity === "critical" ? "error" : "warning"}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-on-surface">{a.pond ? `${pondName(a.pond)} · ` : ""}{a.message}</div>
                  <div className="text-label-sm font-label-sm text-secondary">{toDate(a.ts)?.toLocaleString("es") || ""}</div>
                </div>
              </li>
            ))}
          </ul>

          {can("security:view") && (
            <div className="mt-5 pt-4 border-t border-surface-container-high">
              <h3 className="text-label-lg font-label-lg text-on-surface flex items-center gap-1.5"><span className="material-symbols-outlined text-error text-base" aria-hidden="true">gpp_maybe</span> Alertas de seguridad (admin)</h3>
              <ul className="mt-2 space-y-1.5">
                {secAlerts.items.length === 0 && <li className="text-sm text-secondary">Sin alertas de seguridad.</li>}
                {secAlerts.items.map((s) => (
                  <li key={s.id} className="text-sm p-2 rounded bg-red-50/60 border border-red-200"><strong>{s.kind}</strong>: {s.detail}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-headline-sm font-headline-sm text-on-surface mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[["/monitoreo", "dashboard", "Monitoreo"], ["/dispositivos", "precision_manufacturing", "Dispositivos"], ["/horarios", "schedule", "Horarios"], ["/reportes", "assessment", "Reportes"]].map(([to, icon, label]) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-primary" aria-hidden="true">{icon}</span>
              <span className="text-sm font-semibold text-on-surface">{label}</span>
            </Link>
          ))}
        </div>
        <p className="text-label-sm font-label-sm text-secondary mt-3">Rol activo: <strong>{role}</strong></p>
      </Card>
    </AppLayout>
  );
}
