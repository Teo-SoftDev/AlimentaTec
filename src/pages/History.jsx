import React from "react";
import AppLayout from "../components/AppLayout.jsx";

const SUMMARY_CARDS = [
  {
    label: "Rango Temporal",
    icon: "calendar_month",
    iconColor: "text-secondary",
    value: "30",
    unit: "días",
    detail: "15 Nov 2024 - 15 Dic 2024",
    detailColor: "text-secondary",
    barColor: "bg-primary",
    barWidth: "100%",
  },
  {
    label: "Biomasa Dispensada Total",
    icon: "scale",
    iconColor: "text-primary",
    value: "2,450",
    unit: "kg",
    detail: "+3.2% vs. mes anterior (meta cumplida)",
    detailColor: "text-emerald-700",
    detailIcon: "trending_up",
    barColor: "bg-primary-container",
    barWidth: "82%",
  },
  {
    label: "Precisión / Tolerancia Media",
    icon: "tune",
    iconColor: "text-secondary",
    value: "±0.8",
    unit: "%",
    detail: "Límite aceptable: ±2.0%",
    detailColor: "text-secondary",
    barColor: "bg-emerald-600",
    barWidth: "40%",
  },
  {
    label: "Paradas de Seguridad",
    icon: "shield",
    iconColor: "text-error",
    value: "2",
    valueColor: "text-error",
    unit: "eventos",
    detail: "Tolva trabada (1), Sensor O2 bajo (1)",
    detailColor: "text-secondary",
    barColor: "bg-error",
    barWidth: "12%",
  },
];

const ACTIVE_FILTERS = [
  { label: "Período:", value: "Últimos 30 días" },
  { label: "Hábitat:", value: "Acuático + Terrestre" },
  { label: "Dispensadores:", value: "Todos (18 activos)" },
  { label: "Lotes:", value: "L-2024-AQ / L-2024-TR" },
];

const RECORDS = [
  {
    date: "15/12/2024",
    time: "14:30:00 UTC",
    site: "Estanque AQ-04",
    batch: "Trucha Arcoíris (Lote 12)",
    habitat: "acuatico",
    device: "FEED-AUTO-08",
    programmed: "12.50 kg",
    real: "12.48 kg",
    feedType: "Extruido 4.5mm",
    deviation: "-0.16%",
    deviationColor: "text-emerald-700",
    status: { text: "Completado con éxito", bg: "bg-[#ECFDF5]", color: "text-[#065F46]", border: "border-[#A7F3D0]", dot: "bg-emerald-600" },
    responsible: "Algoritmo BioFeed-v2",
    responsibleDetail: "Auto-dispensación",
    highlight: false,
  },
  {
    date: "15/12/2024",
    time: "13:15:22 UTC",
    site: "Estanque AQ-01",
    batch: "Salmón del Atlántico (Lote 08)",
    habitat: "acuatico",
    device: "FEED-AUTO-01",
    programmed: "18.00 kg",
    real: "15.20 kg",
    feedType: "Pellet Alta Energía",
    deviation: "-15.5%",
    deviationColor: "text-tertiary",
    status: { text: "Dosis ajustada por sensor ambiental", bg: "bg-[#FEF3C7]", color: "text-[#92400E]", border: "border-[#FDE68A]", dot: "bg-amber-600" },
    responsible: "O2 Sonde Sensor",
    responsibleDetail: "Hipoxia relativa detectada",
    highlight: false,
  },
  {
    date: "15/12/2024",
    time: "11:45:10 UTC",
    site: "Recinto TR-B3",
    batch: "Caprinos Reproducción (Lote 03)",
    habitat: "terrestre",
    device: "FEED-TERR-04",
    programmed: "25.00 kg",
    real: "27.50 kg",
    feedType: "Concentrado Forrajero",
    deviation: "+10.0%",
    deviationColor: "text-secondary",
    status: { text: "Intervención manual", bg: "bg-secondary-container", color: "text-on-secondary-fixed-variant", border: "border-secondary-fixed", icon: "touch_app" },
    responsible: "Dra. M. Morales",
    responsibleDetail: "Suplementación gestación",
    highlight: false,
  },
  {
    date: "15/12/2024",
    time: "09:00:00 UTC",
    site: "Estanque AQ-06",
    batch: "Tilapia Nilótica (Lote 19)",
    habitat: "acuatico",
    device: "FEED-AUTO-12",
    programmed: "8.00 kg",
    real: "7.80 kg",
    feedType: "Micro-gránulo 2mm",
    deviation: "-2.50%",
    deviationColor: "text-amber-600",
    status: { text: "Advertencia de nivel", bg: "bg-amber-50", color: "text-amber-900", border: "border-amber-200", icon: "warning" },
    responsible: "Tolva Célula C",
    responsibleDetail: "Tolva <15% capacidad",
    highlight: false,
  },
  {
    date: "14/12/2024",
    time: "22:00:15 UTC",
    site: "Recinto TR-A1",
    siteColor: "text-error",
    batch: "Bovinos Lecheros (Lote 01)",
    habitat: "terrestre",
    device: "FEED-TERR-01",
    programmed: "40.00 kg",
    real: "0.00 kg",
    feedType: "Silo Ensilaje T2",
    deviation: "-100%",
    deviationColor: "text-error",
    status: { text: "Parada de seguridad (Traba)", bg: "bg-[#FEF2F2]", color: "text-[#991B1B]", border: "border-[#FECACA]", dot: "bg-red-600" },
    responsible: "Actuador Sinfin M1",
    responsibleDetail: "Sobrecarga de torque",
    highlight: true,
  },
  {
    date: "14/12/2024",
    time: "18:30:00 UTC",
    site: "Recinto TR-C2",
    batch: "Ovinos Engorde (Lote 05)",
    habitat: "terrestre",
    device: "FEED-TERR-06",
    programmed: "14.00 kg",
    real: "14.05 kg",
    feedType: "Pellet Alfalfa Plus",
    deviation: "+0.35%",
    deviationColor: "text-emerald-700",
    status: { text: "Completado con éxito", bg: "bg-[#ECFDF5]", color: "text-[#065F46]", border: "border-[#A7F3D0]", dot: "bg-emerald-600" },
    responsible: "Algoritmo AgroFeed-v1",
    responsibleDetail: "Ciclo programado",
    highlight: false,
  },
];

function HabitatBadge({ habitat }) {
  if (habitat === "acuatico") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-800 border border-cyan-200">
        <span className="material-symbols-outlined text-xs">water</span>
        <span>Acuático</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
      <span className="material-symbols-outlined text-xs">forest</span>
      <span>Terrestre</span>
    </span>
  );
}

export default function History() {
  return (
    <AppLayout active="historial" searchPlaceholder="Buscar telemetría, lote, código...">
      {/* Breadcrumb + status */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-label-sm font-label-sm text-secondary">
        <div className="flex items-center gap-2">
          <span className="hover:text-primary cursor-pointer">Telemetría Operativa</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-on-surface font-medium">Auditoría y Trazabilidad</span>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant px-3 py-1 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-on-surface">Red IoT: Sincronización en tiempo real (99.8%)</span>
          <span className="text-outline">|</span>
          <span>Último sync: Hoy 14:48:12 UTC</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-primary tracking-tight">Historial de Alimentación y Trazabilidad Nutricional</h1>
          <p className="text-body-sm font-body-sm text-secondary mt-1">
            Registro de precisión de actuadores dosificadores, respuestas biométricas y consistencia de tolvas.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button className="flex items-center gap-2 px-3 py-2 border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-lg text-label-md font-label-md transition-colors active:scale-[0.98]">
            <span className="material-symbols-outlined text-base text-secondary">filter_alt</span>
            <span>Filtro Avanzado</span>
            <span className="px-1.5 py-0.2 bg-primary-fixed text-on-primary-fixed rounded text-xs font-semibold">6</span>
          </button>
          <button className="flex items-center gap-2 px-3.5 py-2 bg-primary-container text-on-primary hover:bg-[#0A484E] rounded-lg text-label-md font-label-md transition-colors shadow-sm active:scale-[0.98]">
            <span className="material-symbols-outlined text-base">download</span>
            <span>Exportar Informe (PDF/CSV/Excel)</span>
            <span className="material-symbols-outlined text-sm">expand_more</span>
          </button>
        </div>
      </div>

      {/* Active filters */}
      <div className="flex flex-wrap items-center gap-2 bg-surface-container-low p-2.5 rounded-lg border border-outline-variant text-body-sm font-body-sm">
        <span className="text-secondary font-medium text-label-sm font-label-sm px-1">Filtros aplicados:</span>
        {ACTIVE_FILTERS.map((f) => (
          <span key={f.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-lowest border border-outline-variant rounded-md text-xs">
            <span className="text-secondary">{f.label}</span> <strong className="text-on-surface">{f.value}</strong>
            <button className="hover:text-error ml-1">
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </span>
        ))}
        <button className="text-primary hover:underline text-label-sm font-label-sm ml-auto pr-1">Limpiar filtros</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY_CARDS.map((c) => (
          <div key={c.label} className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-label-sm text-secondary">{c.label}</span>
              <span className={`material-symbols-outlined text-lg ${c.iconColor}`}>{c.icon}</span>
            </div>
            <div className="my-2">
              <p className={`text-data-metric font-data-metric tracking-tight ${c.valueColor || "text-on-surface"}`}>
                {c.value} <span className="text-headline-sm text-secondary font-normal">{c.unit}</span>
              </p>
              <p className={`text-body-sm font-body-sm flex items-center gap-1 ${c.detailColor}`}>
                {c.detailIcon && <span className="material-symbols-outlined text-xs">{c.detailIcon}</span>}
                <span>{c.detail}</span>
              </p>
            </div>
            <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
              <div className={`${c.barColor} h-full`} style={{ width: c.barWidth }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-headline-sm font-headline-sm text-on-surface">Curva de Dosificación y Trazabilidad Acumulada</h2>
            <p className="text-body-sm font-body-sm text-secondary">Consumo diario real vs. curva teórica de alimentación bio-óptima</p>
          </div>
          <div className="flex items-center gap-4 text-label-sm font-label-sm">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-primary"></span> Ración Real (kg)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-outline-variant"></span> Programación Teórica
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span> Ajuste por Biomasa
            </span>
          </div>
        </div>
        <div className="w-full h-32 relative">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 900 120">
            <line stroke="#f1f5f9" strokeDasharray="4 4" x1="0" x2="900" y1="30" y2="30"></line>
            <line stroke="#f1f5f9" strokeDasharray="4 4" x1="0" x2="900" y1="60" y2="60"></line>
            <line stroke="#f1f5f9" strokeDasharray="4 4" x1="0" x2="900" y1="90" y2="90"></line>
            <path d="M0,85 Q150,75 300,70 T600,50 T900,32" fill="none" stroke="#bfc8c9" strokeDasharray="5 4" strokeWidth="2"></path>
            <defs>
              <linearGradient id="feedGradientHist" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0d5c63" stopOpacity="0.25"></stop>
                <stop offset="100%" stopColor="#0d5c63" stopOpacity="0.0"></stop>
              </linearGradient>
            </defs>
            <path d="M0,88 Q150,80 300,68 T600,48 T900,30 L900,120 L0,120 Z" fill="url(#feedGradientHist)"></path>
            <path d="M0,88 Q150,80 300,68 T600,48 T900,30" fill="none" stroke="#004349" strokeWidth="2.5"></path>
            <circle cx="210" cy="74" fill="#004349" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
            <circle cx="450" cy="58" fill="#004349" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
            <circle cx="680" cy="42" fill="#004349" r="3.5" stroke="#ffffff" strokeWidth="1.5"></circle>
            <circle cx="890" cy="30" fill="#d97706" r="4.5" stroke="#ffffff" strokeWidth="2"></circle>
          </svg>
        </div>
        <div className="flex justify-between text-label-sm font-label-sm text-secondary pt-2 border-t border-surface-container">
          <span>Semana 46 (Inicio)</span>
          <span>Semana 47</span>
          <span>Semana 48 (Calibración General)</span>
          <span>Semana 49</span>
          <span>Semana 50 (Hoy)</span>
        </div>
      </div>

      {/* Audit table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-headline-sm font-headline-sm text-on-surface">Registros de Raciones</span>
            <span className="px-2 py-0.5 bg-surface-container text-secondary text-xs rounded-full font-medium">1,248 eventos totales</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-secondary text-sm">search</span>
              <input
                className="pl-8 pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary w-56 sm:w-64"
                placeholder="Filtrar por estanque, tag o ID..."
                type="text"
              />
            </div>
            <button className="p-1.5 hover:bg-surface-container text-secondary rounded-lg border border-outline-variant" title="Recargar registros">
              <span className="material-symbols-outlined text-base">refresh</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container text-secondary text-label-sm font-label-sm uppercase tracking-wider">
                <th className="py-3 px-4">Fecha &amp; Hora</th>
                <th className="py-3 px-4">Identificador / Recinto</th>
                <th className="py-3 px-4">Hábitat</th>
                <th className="py-3 px-4">Dispensador</th>
                <th className="py-3 px-4 text-right">Prog. vs Real</th>
                <th className="py-3 px-4 text-right">Desviación</th>
                <th className="py-3 px-4">Estado del Evento</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-body-sm font-body-sm text-on-surface">
              {RECORDS.map((r) => (
                <tr key={`${r.date}-${r.time}`} className={`hover:bg-surface-container-low/60 transition-colors ${r.highlight ? "bg-red-50/20" : ""}`}>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                    <div>{r.date}</div>
                    <div className="text-secondary">{r.time}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className={`font-semibold ${r.siteColor || "text-primary"}`}>{r.site}</div>
                    <div className="text-secondary text-xs">{r.batch}</div>
                  </td>
                  <td className="py-3 px-4">
                    <HabitatBadge habitat={r.habitat} />
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-secondary">{r.device}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    <div>
                      {r.programmed} <span className="text-secondary text-xs">/ {r.real}</span>
                    </div>
                    <div className="text-xs text-secondary">{r.feedType}</div>
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-medium ${r.deviationColor}`}>{r.deviation}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${r.status.bg} ${r.status.color} border ${r.status.border}`}>
                      {r.status.dot && <span className={`w-1.5 h-1.5 rounded-full ${r.status.dot}`}></span>}
                      {r.status.icon && <span className="material-symbols-outlined text-xs">{r.status.icon}</span>}
                      <span>{r.status.text}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span className="font-medium">{r.responsible}</span>
                    <div className="text-secondary">{r.responsibleDetail}</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      className={`p-1.5 hover:bg-surface-container rounded transition-colors inline-flex items-center justify-center ${
                        r.highlight ? "text-error hover:text-error" : "text-secondary hover:text-primary"
                      }`}
                      title="Ver telemetría y registro fotográfico"
                    >
                      <span className="material-symbols-outlined text-lg">{r.highlight ? "troubleshoot" : "visibility"}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-label-sm font-label-sm text-secondary">
          <div className="flex items-center gap-2">
            <span>Mostrando registros</span>
            <span className="font-semibold text-on-surface">1 - 6</span>
            <span>de</span>
            <span className="font-semibold text-on-surface">1,248</span>
            <span className="mx-2 text-outline-variant">|</span>
            <span>Filas por página:</span>
            <select className="py-1 px-2 border border-outline-variant rounded bg-surface-container-low text-xs text-on-surface focus:outline-none">
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
          </div>
          <div className="flex items-center space-x-1">
            <button disabled className="p-1 rounded border border-outline-variant hover:bg-surface-container disabled:opacity-40">
              <span className="material-symbols-outlined text-base">first_page</span>
            </button>
            <button disabled className="p-1 rounded border border-outline-variant hover:bg-surface-container disabled:opacity-40">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button className="px-2.5 py-1 bg-primary text-on-primary rounded text-xs font-semibold">1</button>
            <button className="px-2.5 py-1 hover:bg-surface-container rounded text-xs">2</button>
            <button className="px-2.5 py-1 hover:bg-surface-container rounded text-xs">3</button>
            <span className="px-1 text-secondary">...</span>
            <button className="px-2.5 py-1 hover:bg-surface-container rounded text-xs">50</button>
            <button className="p-1 rounded border border-outline-variant hover:bg-surface-container">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
            <button className="p-1 rounded border border-outline-variant hover:bg-surface-container">
              <span className="material-symbols-outlined text-base">last_page</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual inspection drawer */}
      <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm">
        <div className="flex items-center justify-between border-b border-surface-container pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">camera_indoor</span>
            <h3 className="text-headline-sm font-headline-sm text-on-surface">Auditoría Visual In-Situ: Último Evento Inspeccionado (AQ-04)</h3>
          </div>
          <span className="text-label-sm font-label-sm text-secondary font-mono">Timestamp: 15/12/2024 14:30:08 UTC</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="relative rounded-lg overflow-hidden border border-outline-variant group">
            <img
              alt="Vista submarina de la zona de alimentación con dispersión de pellets"
              className="w-full h-44 object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEUWJFQtgQlH80tInq5N8bIlExEnkLoTCewRzRXkfU0eCjWAWw58sokooH0bmaXSpcLUqbSMiWkIEfZhAkKhltijzxxRnBGCHQmjlQMeR_GtuG4X6rLV1oDpZKOJwfBf4vPntDe4-yyvfpR_uJ4SnIB4OWDCBKmzthkahNqvLmpWC1lwXccOA9jWfhthUggoz9ytAeOYs7xK41httoihWuETfjVyhlvEHqS33mxXfgpKkVs7amUqW3VQ"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-xs">
              <p className="font-semibold">Cámara Subacuática CAM-AQ04-A</p>
              <p className="text-slate-300 text-[11px]">Respuesta de apetito: 94% (Alta actividad)</p>
            </div>
          </div>
          <div className="relative rounded-lg overflow-hidden border border-outline-variant group">
            <img
              alt="Actuador dosificador mecánico dispensando alimento"
              className="w-full h-44 object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBw3EZEZlojLP_D53QmhRgcDI1DA332j-j5WJODWG3MheNZzT12Ixhl58HyOo8NTEmbcSqg7APwfZ_TbLTmU8LiEpOQxddz9l8tADLt9JGGrChx6yHq0026Ia6EVAWK7UQjLbv5IMLRNsybxVJb1tVZ4l-nIijGCZLynIxrI0D601xLNCbi0vLiX84Vi_DeipBN-NEkBT2RbN3yJjdmnAhpMFEUEoMw6q6MJ1jW0IgpBg5rwKNLl8kfPA"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-xs">
              <p className="font-semibold">Actuador Dosificador Tolva #08</p>
              <p className="text-slate-300 text-[11px]">Apertura de válvula: 100% nominal | Sin atascos</p>
            </div>
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant space-y-3 h-full flex flex-col justify-between">
            <div>
              <p className="text-label-md font-label-md text-on-surface mb-2">Parámetros Ambientales Concurrentes</p>
              <div className="space-y-2 text-body-sm font-body-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Oxígeno Disuelto:</span>
                  <span className="font-mono font-semibold text-emerald-700">7.8 mg/L (Óptimo)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Temperatura del Agua:</span>
                  <span className="font-mono font-semibold">14.2 °C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">pH Estanque:</span>
                  <span className="font-mono font-semibold">7.35</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Tasa de Flujo:</span>
                  <span className="font-mono font-semibold">120 L/min</span>
                </div>
              </div>
            </div>
            <button className="w-full py-1.5 px-3 bg-surface-container-highest hover:bg-surface-variant text-on-surface rounded text-label-sm font-label-sm border border-outline-variant transition-colors flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>Validar Registro de Auditoría</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
