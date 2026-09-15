import React from "react";
import AppLayout from "../components/AppLayout.jsx";
import ToggleSwitch from "../components/ToggleSwitch.jsx";

const KPIS = [
  {
    label: "Total Dispositivos",
    icon: "devices",
    iconColor: "text-primary",
    value: "18",
    unit: "unidades",
    barColor: "bg-primary",
    barWidth: "100%",
  },
  {
    label: "En Línea",
    value: "17",
    unit: "/ 18 nodos",
    badge: { text: "94.4%", dotColor: "bg-green-600", bg: "bg-green-50", border: "border-green-200", textColor: "text-green-800" },
    barColor: "bg-primary-container",
    barWidth: "94.4%",
  },
  {
    label: "En Alerta de Nivel",
    icon: "warning",
    iconColor: "text-amber-600",
    value: "2",
    unit: "Tolva crítica",
    unitColor: "text-amber-600 font-semibold",
    valueColor: "text-amber-700",
    barColor: "bg-amber-500",
    barWidth: "25%",
  },
  {
    label: "Consumo Promedio 24h",
    icon: "scale",
    iconColor: "text-primary",
    value: "42.5",
    unit: "kg dispersados",
    barColor: "bg-primary",
    barWidth: "68%",
  },
];

function KpiCard({ kpi }) {
  return (
    <div className="bg-surface-container-lowest p-4 rounded-lg border border-surface-container-high shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between text-secondary">
        <span className="text-label-sm font-label-sm">{kpi.label}</span>
        {kpi.badge ? (
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${kpi.badge.bg} border ${kpi.badge.border}`}>
            <span className={`w-2 h-2 rounded-full ${kpi.badge.dotColor} animate-pulse`}></span>
            <span className={`text-label-sm font-label-sm ${kpi.badge.textColor}`}>{kpi.badge.text}</span>
          </div>
        ) : (
          <span className={`material-symbols-outlined ${kpi.iconColor}`}>{kpi.icon}</span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-data-metric font-data-metric ${kpi.valueColor || "text-on-surface"}`}>{kpi.value}</span>
        <span className={`text-label-sm font-label-sm ${kpi.unitColor || "text-secondary"}`}>{kpi.unit}</span>
      </div>
      <div className="mt-3 w-full bg-surface-container h-1 rounded-full overflow-hidden">
        <div className={`${kpi.barColor} h-full rounded-full`} style={{ width: kpi.barWidth }}></div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    online: "flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-50 border border-green-200 text-green-800 text-label-sm font-label-sm",
    dispensing: "flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-label-sm font-label-sm",
    idle: "flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container text-secondary text-label-sm font-label-sm border border-surface-container-high",
    critical: "flex items-center gap-1.5 px-2.5 py-1 rounded bg-error-container text-on-error-container text-label-sm font-label-sm border border-error/20 font-bold",
  };
  const dotMap = {
    online: "w-2 h-2 rounded-full bg-green-600",
    dispensing: "w-2 h-2 rounded-full bg-amber-600 animate-ping",
    idle: "w-2 h-2 rounded-full bg-secondary",
  };
  if (status.type === "critical") {
    return (
      <div className={map.critical}>
        <span className="material-symbols-outlined text-[16px]">error</span>
        <span>{status.label}</span>
      </div>
    );
  }
  return (
    <div className={map[status.type]}>
      <span className={dotMap[status.type]}></span>
      <span className={status.type === "dispensing" ? "font-semibold" : ""}>{status.label}</span>
    </div>
  );
}

export default function Devices() {
  return (
    <AppLayout active="dispositivos" searchPlaceholder="Buscar dispensador, estanque...">
      {/* TITLE + PRIMARY ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-surface-container-high pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-label-sm font-label-sm text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">hub</span> Red IoT Distribuida
            </span>
            <span className="inline-block w-1 h-1 rounded-full bg-secondary"></span>
            <span className="text-label-sm font-label-sm text-primary font-semibold">Puerta de enlace Activa</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">
            Gestión de Dispositivos y Dispensadores IoT
          </h1>
          <p className="text-body-md font-body-md text-secondary mt-0.5">
            Control de hardware telemétrico, calibración de tolvas y actuadores de precisión.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded border border-on-surface text-on-surface hover:bg-on-surface hover:text-white transition-all text-label-md font-label-md">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Sincronizar</span>
          </button>
          <button className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded text-label-md font-label-md hover:bg-primary-container shadow-sm transition-all active:scale-[0.98]">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Vincular Nuevo Alimentador</span>
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      {/* FILTER TOOLBAR */}
      <section className="bg-surface-container-lowest p-3 rounded-lg border border-surface-container-high shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-surface-container p-1 rounded">
          <button className="px-3 py-1.5 rounded text-label-md font-label-md bg-white text-primary shadow-sm font-semibold">
            Todos (18)
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-label-md font-label-md text-secondary hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[16px]">pool</span>
            <span>Acuático - Tanques/Estanques (11)</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-label-md font-label-md text-secondary hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[16px]">landscape</span>
            <span>Terrestre - Recintos/Corrales (7)</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select className="h-9 pl-3 pr-8 rounded border border-outline-variant bg-surface text-on-surface text-label-md font-label-md focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer">
              <option>Estado: Todos</option>
              <option>En línea</option>
              <option>Batería baja</option>
              <option>En calibración</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-[18px]">
              arrow_drop_down
            </span>
          </div>
          <div className="relative">
            <select className="h-9 pl-3 pr-8 rounded border border-outline-variant bg-surface text-on-surface text-label-md font-label-md focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer">
              <option>Protocolo: LoRaWAN / WiFi / 4G</option>
              <option>LoRaWAN Industrial</option>
              <option>WiFi Mesh</option>
              <option>4G/LTE M2M</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-[18px]">
              tune
            </span>
          </div>
        </div>
      </section>

      {/* DEVICE CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: AquaFeed Pro-10 */}
        <article className="bg-surface-container-lowest rounded-lg border border-surface-container-high hover:border-outline-variant shadow-sm transition-all duration-150 flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-surface-container">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary border border-surface-container-high">
                  <span className="material-symbols-outlined text-[24px]">water_ph</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-headline-sm font-headline-sm text-on-surface">AquaFeed Pro-10</h3>
                    <span className="text-label-sm font-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary">SN-AQ8832</span>
                  </div>
                  <p className="text-label-sm font-label-sm text-secondary mt-0.5">Tanque A3 • Tilapia / Salmón Atlántico</p>
                </div>
              </div>
              <StatusBadge status={{ type: "online", label: "En línea" }} />
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-label-sm font-label-sm text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">inventory_2</span> Capacidad Tolva Submarina
                </span>
                <span className="text-label-md font-label-md font-bold text-on-surface">
                  82% <span className="text-secondary font-normal font-body-sm">(41.0 / 50 kg)</span>
                </span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full rounded-full transition-all duration-500" style={{ width: "82%" }}></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-3 bg-surface-container-low rounded">
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Batería Litio</span>
                <span className="text-body-md font-body-md font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-green-700">battery_charging_full</span>
                  95%
                </span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Señal LoRaWAN</span>
                <span className="text-body-md font-body-md font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">signal_cellular_alt</span>
                  Excelente (-78dBm)
                </span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Última Dispersión</span>
                <span className="text-body-md font-body-md font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">history</span>
                  Hace 25 min
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-label-sm font-label-sm text-secondary border-t border-surface-container pt-3">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">air</span> Flujo eyector: 3.2 bar
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">water_drop</span> Profundidad sensor: 4.5m
              </span>
            </div>
          </div>
          <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center justify-between gap-3">
            <ToggleSwitch label="Auto-alimentación" defaultChecked />
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-outline-variant bg-white text-on-surface hover:bg-surface-container transition-colors text-label-md font-label-md">
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span>Ajustes</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-tertiary text-on-tertiary hover:bg-tertiary-container transition-colors text-label-md font-label-md shadow-sm active:scale-[0.98]">
                <span className="material-symbols-outlined text-[18px]">scatter_plot</span>
                <span>Dispensación Manual de Prueba</span>
              </button>
            </div>
          </div>
        </article>

        {/* CARD 2: TerraFeeder Max-4 */}
        <article className="bg-surface-container-lowest rounded-lg border border-surface-container-high hover:border-outline-variant shadow-sm transition-all duration-150 flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-surface-container">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-tertiary border border-amber-200">
                  <span className="material-symbols-outlined text-[24px]">rotate_right</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-headline-sm font-headline-sm text-on-surface">TerraFeeder Max-4</h3>
                    <span className="text-label-sm font-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary">SN-TF4109</span>
                  </div>
                  <p className="text-label-sm font-label-sm text-secondary mt-0.5">Recinto B • Felinos / Rumiantes Mayores</p>
                </div>
              </div>
              <StatusBadge status={{ type: "dispensing", label: "Dispensando" }} />
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-label-sm font-label-sm text-amber-800 flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">warning</span> Nivel de Tolva Bajo (Alerta Ámbar)
                </span>
                <span className="text-label-md font-label-md font-bold text-amber-800">
                  34% <span className="text-secondary font-normal font-body-sm">(17.0 / 50 kg)</span>
                </span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: "34%" }}></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-3 bg-surface-container-low rounded">
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Conectividad</span>
                <span className="text-body-md font-body-md font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">wifi</span>
                  WiFi Mesh 5GHz
                </span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Calibración Rotor</span>
                <span className="text-body-md font-body-md font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">event_available</span>
                  Hace 2 días
                </span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Ciclo de Giro</span>
                <span className="text-body-md font-body-md font-semibold text-amber-800 flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-600 animate-spin">sync</span>
                  Paso 4/6 activo
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-label-sm font-label-sm text-secondary border-t border-surface-container pt-3">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">lock_clock</span> Próx. dosis: En ejecución (750g)
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">thermostat</span> Temp. motor: 34.2 °C
              </span>
            </div>
          </div>
          <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center justify-between gap-3">
            <ToggleSwitch label="Auto-alimentación" defaultChecked />
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-outline-variant bg-white text-on-surface hover:bg-surface-container transition-colors text-label-md font-label-md">
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span>Ajustes</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-600 text-amber-800 hover:bg-amber-50 transition-colors text-label-md font-label-md">
                <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                <span>Pausar Ciclo</span>
              </button>
            </div>
          </div>
        </article>

        {/* CARD 3: Coral Reef Feeder */}
        <article className="bg-surface-container-lowest rounded-lg border border-surface-container-high hover:border-outline-variant shadow-sm transition-all duration-150 flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-surface-container">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary-container border border-surface-container-high">
                  <span className="material-symbols-outlined text-[24px]">science</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-headline-sm font-headline-sm text-on-surface">Coral Reef Feeder</h3>
                    <span className="text-label-sm font-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary">SN-CR0204</span>
                  </div>
                  <p className="text-label-sm font-label-sm text-secondary mt-0.5">Acuario Investigación 2 • Micro-plancton bioactivo</p>
                </div>
              </div>
              <StatusBadge status={{ type: "idle", label: "En reposo" }} />
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-label-sm font-label-sm text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">vaccines</span> Nivel de Micro-Nutrientes
                </span>
                <span className="text-label-md font-label-md font-bold text-on-surface">
                  68% <span className="text-secondary font-normal font-body-sm">(3.4 / 5.0 L)</span>
                </span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full rounded-full transition-all duration-500" style={{ width: "68%" }}></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-3 bg-surface-container-low rounded">
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Régimen Activo</span>
                <span className="text-body-md font-body-md font-semibold text-primary flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">wb_twilight</span>
                  Modo fotoperíodo
                </span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Micro-dosis Ref.</span>
                <span className="text-body-md font-body-md font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">water_drop</span>
                  12.5 ml / pulso
                </span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Próx. Activación</span>
                <span className="text-body-md font-body-md font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">timer</span>
                  En 2h 45min
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-label-sm font-label-sm text-secondary border-t border-surface-container pt-3">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">light_mode</span> Simulación actínica: 450nm
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span> Válvula solenoide sellada
              </span>
            </div>
          </div>
          <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center justify-between gap-3">
            <ToggleSwitch label="Auto-alimentación" defaultChecked />
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-outline-variant bg-white text-on-surface hover:bg-surface-container transition-colors text-label-md font-label-md">
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span>Ajustes</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary hover:text-white transition-all text-label-md font-label-md">
                <span className="material-symbols-outlined text-[18px]">science</span>
                <span>Micro-pulso (1ml)</span>
              </button>
            </div>
          </div>
        </article>

        {/* CARD 4: FeedStation X8 (crítico) */}
        <article className="bg-surface-container-lowest rounded-lg border border-red-200 hover:border-error shadow-sm transition-all duration-150 flex flex-col justify-between overflow-hidden">
          <div className="p-5 border-b border-surface-container bg-red-50/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-error border border-red-200">
                  <span className="material-symbols-outlined text-[24px]">warehouse</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-headline-sm font-headline-sm text-on-surface">FeedStation X8</h3>
                    <span className="text-label-sm font-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary">SN-FS9981</span>
                  </div>
                  <p className="text-label-sm font-label-sm text-secondary mt-0.5">Paddock Norte • Silo de Gran Volumen</p>
                </div>
              </div>
              <StatusBadge status={{ type: "critical", label: "Alerta tolva baja (12%)" }} />
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-label-sm font-label-sm text-error font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">crisis_alert</span> Reserva Crítica de Alimento Seco
                </span>
                <span className="text-label-md font-label-md font-bold text-error">
                  12% <span className="text-secondary font-normal font-body-sm">(36 / 300 kg)</span>
                </span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-error h-full rounded-full transition-all duration-500" style={{ width: "12%" }}></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-3 bg-surface-container-low rounded">
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Telemetría Red</span>
                <span className="text-body-md font-body-md font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">cell_tower</span>
                  4G/LTE M2M
                </span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Autonomía Silo</span>
                <span className="text-body-md font-body-md font-bold text-error flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">timelapse</span>
                  ~6 horas est.
                </span>
              </div>
              <div>
                <span className="text-label-sm font-label-sm text-secondary block">Sensor de Carga</span>
                <span className="text-body-md font-body-md font-semibold text-on-surface flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">scale</span>
                  Celda Piezo-4
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-label-sm font-label-sm text-secondary border-t border-surface-container pt-3">
              <span className="flex items-center gap-1 text-error font-medium">
                <span className="material-symbols-outlined text-[16px]">notification_important</span> Orden de reabastecimiento generada
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">solar_power</span> Batería Solar: 100%
              </span>
            </div>
          </div>
          <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center justify-between gap-3">
            <ToggleSwitch label="Auto-alimentación" defaultChecked />
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-outline-variant bg-white text-on-surface hover:bg-surface-container transition-colors text-label-md font-label-md">
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span>Ajustes</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-error text-on-error hover:bg-red-700 transition-colors text-label-md font-label-md shadow-sm active:scale-[0.98]">
                <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                <span>Solicitar Relleno</span>
              </button>
            </div>
          </div>
        </article>
      </section>

      {/* DIAGNOSTIC STRIP */}
      <section className="bg-surface-container-lowest p-4 rounded-lg border border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-4 text-secondary text-body-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
          <span>
            Protocolo MQTT Broker v5.0 activo: <strong>broker.alimentatec.net (Puerto 8883 TLS 1.3)</strong>
          </span>
        </div>
        <div className="flex items-center gap-6 text-label-sm font-label-sm">
          <span>
            Latencia de red: <strong>24 ms</strong>
          </span>
          <span>
            Paquetes perdidos: <strong>0.00%</strong>
          </span>
          <span className="text-primary font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">lock</span> Cifrado e2e Activo
          </span>
        </div>
      </section>
    </AppLayout>
  );
}
