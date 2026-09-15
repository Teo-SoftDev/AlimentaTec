import React, { useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const KPIS = [
  {
    label: "Eficiencia de Consumo",
    badge: { text: "ÓPTIMO", bg: "bg-[#ECFDF5]", color: "text-[#065F46]", border: "border-[#A7F3D0]" },
    value: "1.18",
    unit: "FCR Index",
    trend: { icon: "trending_down", text: "-0.04", color: "text-[#059669]", suffix: "vs. ciclo alimentario anterior" },
    barColor: "bg-[#059669]",
    barWidth: "88%",
  },
  {
    label: "Alimento Suministrado Hoy",
    badgeText: <span className="text-label-sm font-label-sm font-semibold text-primary">Progreso 94%</span>,
    value: "84.6",
    unit: "kg / 90.0 kg",
    trend: { icon: "timelapse", text: "", color: "text-primary", suffix: "5 de 6 micro-dispensaciones ejecutadas" },
    barColor: "bg-primary",
    barWidth: "94%",
  },
  {
    label: "Residuos / Sedimento",
    badge: { text: "NIVEL EXCELENTE", bg: "bg-[#ECFDF5]", color: "text-[#065F46]", border: "border-[#A7F3D0]" },
    value: "1.4%",
    valueColor: "text-[#065F46]",
    unit: "Cámara Óptica",
    trend: { icon: "check_circle", text: "", color: "text-[#059669]", suffix: "Pérdida por lixiviación casi nula" },
    barColor: "bg-[#059669]",
    barWidth: "14%",
  },
  {
    label: "Apetito del Lote",
    badge: { text: "ALTO CONSUMO", bg: "bg-[#FEF3C7]", color: "text-[#92400E]", border: "border-[#FDE68A]", dot: "bg-[#D97706]" },
    value: "92",
    unit: "/ 100 Score",
    trend: { icon: "bolt", text: "", color: "text-primary", suffix: "Frecuencia de nado óptima (+18% voracidad)" },
    barColor: "bg-[#D97706]",
    barWidth: "92%",
  },
];

const EVENT_LOG = [
  {
    time: "18:42:10",
    dot: "bg-[#059669]",
    event: "Ciclo Micro-Dosis Finalizado",
    device: "Alimentador Barométrico #04",
    params: "15.0 kg dosificados en 120s",
    eval: { text: "Consumo Inmediato: 98.6%", bg: "bg-[#ECFDF5]", color: "text-[#065F46]", border: "border-[#A7F3D0]" },
    status: { icon: "verified", text: "Confirmado Ópticamente", color: "text-[#059669]" },
  },
  {
    time: "18:30:45",
    dot: "bg-[#D97706]",
    event: "Aceleración de Cardumen",
    device: "Sonar de Biomasa Sonar-A2",
    params: "Densidad: 42 kg/m³ (+12%)",
    eval: { text: "Requerimiento Calórico Elevado", bg: "bg-[#FEF3C7]", color: "text-[#92400E]", border: "border-[#FDE68A]" },
    status: { icon: "published_with_changes", text: "Ración Ajustada Auto", color: "text-[#D97706]" },
  },
  {
    time: "18:15:00",
    dot: "bg-primary",
    event: "Telemetría de Calidad de Agua",
    device: "Sonda Multiparamétrica AquaProbe",
    params: "pH 7.42 • OD 7.8 ppm • Salinidad 0.2‰",
    eval: { text: "Entorno Saludable Grado A", bg: "bg-[#ECFDF5]", color: "text-[#065F46]", border: "border-[#A7F3D0]" },
    status: { icon: "check_circle", text: "Normal", color: "text-[#059669]" },
  },
  {
    time: "17:45:12",
    dot: "bg-secondary",
    event: "Tara Automática de Celda de Carga",
    device: "Tolva Principal Silo #01",
    params: "Delta de pesaje: 0.002 kg",
    eval: { text: "Desviación estándar: ±0.01%", bg: "bg-surface-container", color: "text-secondary", border: "border-transparent" },
    status: { icon: "done_all", text: "Verificado Sistema", color: "text-secondary" },
  },
];

export default function Monitoring() {
  const [habitat, setHabitat] = useState("acuatico");
  const [range, setRange] = useState("24h");

  return (
    <AppLayout active="monitoreo" searchPlaceholder="Buscar lote, sonda o actuador...">
      {/* Header + Selectors */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-label-sm font-label-sm font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>
              En Línea • Canales Sincronizados
            </span>
            <span className="text-label-sm font-label-sm text-secondary">Estanque #04 - Trucha Arcoíris Juvenil</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-primary tracking-tight">
            Monitoreo de Telemetría y Consumo en Tiempo Real
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex bg-surface-container-lowest p-1 rounded-lg border border-outline-variant shadow-sm text-label-sm font-label-sm">
            <button
              onClick={() => setHabitat("acuatico")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                habitat === "acuatico" ? "bg-primary text-on-primary font-semibold shadow-sm" : "text-secondary hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-base">water</span>
              <span>Acuario Central / Granja Piscícola</span>
            </button>
            <button
              onClick={() => setHabitat("terrestre")}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                habitat === "terrestre" ? "bg-primary text-on-primary font-semibold shadow-sm" : "text-secondary hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-base">forest</span>
              <span>Santuario Terrestre</span>
            </button>
          </div>
          <div className="inline-flex bg-surface-container-lowest p-1 rounded-lg border border-outline-variant shadow-sm text-label-sm font-label-sm">
            {["12h", "24h", "7d"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1.5 rounded transition-colors ${
                  range === r ? "bg-secondary-container text-on-secondary-fixed font-semibold" : "text-secondary hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                {r === "12h" ? "Últimas 12h" : r === "24h" ? "24h" : "7 días"}
              </button>
            ))}
          </div>
          <button className="p-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors shadow-sm" title="Forzar Sincronización">
            <span className="material-symbols-outlined text-lg block">sync</span>
          </button>
        </div>
      </section>

      {/* KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-label-sm font-label-sm text-secondary">
              <span className="font-semibold uppercase tracking-wider">{kpi.label}</span>
              {kpi.badge ? (
                <span className={`${kpi.badge.bg} ${kpi.badge.color} border ${kpi.badge.border} px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1`}>
                  {kpi.badge.dot && <span className={`w-1.5 h-1.5 rounded-full ${kpi.badge.dot} animate-ping`}></span>}
                  {kpi.badge.text}
                </span>
              ) : (
                kpi.badgeText
              )}
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className={`text-data-metric font-data-metric leading-none ${kpi.valueColor || "text-on-surface"}`}>{kpi.value}</span>
                <span className="text-label-md font-label-md text-secondary">{kpi.unit}</span>
              </div>
              <p className="text-body-sm font-body-sm text-secondary mt-1 flex items-center gap-1">
                <span className={`material-symbols-outlined text-sm ${kpi.trend.color}`}>{kpi.trend.icon}</span>
                {kpi.trend.text && <span className={`${kpi.trend.color} font-medium`}>{kpi.trend.text}</span>}
                <span>{kpi.trend.suffix}</span>
              </p>
            </div>
            <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
              <div className={`${kpi.barColor} h-full rounded-full`} style={{ width: kpi.barWidth }}></div>
            </div>
          </div>
        ))}
      </section>

      {/* Chart + camera */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-surface-container-high">
            <div>
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Curva Dinámica de Telemetría y Respuesta Alimentaria</h2>
              <p className="text-body-sm font-body-sm text-secondary">Correlación de dosis vs. voracidad del cardumen y variables fisicoquímicas</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-label-sm font-label-sm">
              <span className="flex items-center gap-1.5 text-on-surface">
                <span className="w-3 h-1 bg-[#0D5C63] rounded"></span> Dispensación (kg/h)
              </span>
              <span className="flex items-center gap-1.5 text-on-surface">
                <span className="w-3 h-1 bg-[#D97706] rounded"></span> Respuesta Animal (%)
              </span>
              <span className="flex items-center gap-1.5 text-secondary">
                <span className="w-2 h-2 rounded-full border border-primary"></span> Temp Agua: 16.4°C
              </span>
              <span className="flex items-center gap-1.5 text-secondary">
                <span className="w-2 h-2 rounded-full border border-secondary"></span> Turbidez: 1.8 NTU
              </span>
            </div>
          </div>

          <div className="relative w-full h-72 bg-[#F8FAFC] rounded-lg border border-surface-container p-3 flex flex-col justify-between">
            <div className="absolute inset-x-8 inset-y-6 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-dashed border-outline-variant w-full"></div>
              <div className="border-b border-dashed border-outline-variant w-full"></div>
              <div className="border-b border-dashed border-outline-variant w-full"></div>
              <div className="border-b border-dashed border-outline-variant w-full"></div>
            </div>
            <svg className="w-full h-full relative z-10 overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 220">
              <defs>
                <linearGradient id="feedFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0D5C63" stopOpacity="0.25"></stop>
                  <stop offset="100%" stopColor="#0D5C63" stopOpacity="0.0"></stop>
                </linearGradient>
                <linearGradient id="appetiteFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#D97706" stopOpacity="0.2"></stop>
                  <stop offset="100%" stopColor="#D97706" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>
              <path d="M 0,180 Q 80,175 140,110 T 260,130 T 380,50 T 490,95 T 600,40 L 700,70 L 700,210 L 0,210 Z" fill="url(#feedFill)"></path>
              <path d="M 0,180 Q 80,175 140,110 T 260,130 T 380,50 T 490,95 T 600,40 L 700,70" fill="none" stroke="#0D5C63" strokeLinecap="round" strokeWidth="2.5"></path>
              <path d="M 0,195 Q 90,190 145,100 T 270,120 T 385,45 T 495,85 T 605,32 L 700,60 L 700,210 L 0,210 Z" fill="url(#appetiteFill)"></path>
              <path d="M 0,195 Q 90,190 145,100 T 270,120 T 385,45 T 495,85 T 605,32 L 700,60" fill="none" stroke="#D97706" strokeDasharray="2 1" strokeLinecap="round" strokeWidth="2.5"></path>
              <g transform="translate(605, 32)">
                <circle className="animate-ping opacity-75" fill="#D97706" r="7"></circle>
                <circle fill="#D97706" r="4"></circle>
                <circle fill="#FFFFFF" r="2"></circle>
              </g>
              <path d="M 0,140 C 180,145 350,135 520,138 L 700,142" fill="none" opacity="0.7" stroke="#545F73" strokeDasharray="4 4" strokeWidth="1.5"></path>
            </svg>
            <div className="flex justify-between items-center text-label-sm font-label-sm text-secondary pt-2 border-t border-surface-container">
              <span>08:00</span>
              <span>10:30</span>
              <span>13:00 (Dosis Pico)</span>
              <span>15:30</span>
              <span>17:00</span>
              <span className="text-primary font-semibold">18:45 (Actual)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-surface-container-high text-body-sm font-body-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">thermostat</span>
              <div>
                <p className="text-label-sm font-label-sm text-secondary leading-none">Temp. Bioma</p>
                <p className="font-semibold text-on-surface">
                  16.4 °C <span className="text-[10px] text-[#059669]">(Estable)</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">opacity</span>
              <div>
                <p className="text-label-sm font-label-sm text-secondary leading-none">Oxígeno Disuelto</p>
                <p className="font-semibold text-on-surface">
                  7.8 ppm <span className="text-[10px] text-[#059669]">(Saturación 96%)</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">grain</span>
              <div>
                <p className="text-label-sm font-label-sm text-secondary leading-none">Calibre Pellet</p>
                <p className="font-semibold text-on-surface">
                  4.5 mm <span className="text-[10px] text-secondary">(Bio-Flotante)</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">tune</span>
              <div>
                <p className="text-label-sm font-label-sm text-secondary leading-none">Actuador Dosificador</p>
                <p className="font-semibold text-on-surface">Tolva #2 Activa</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">videocam</span>
                <h3 className="text-label-lg font-label-lg text-on-surface">Cámara Submarina 01</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-label-sm font-label-sm font-semibold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#991B1B] animate-pulse"></span>
                REC LIVE
              </span>
            </div>
            <div className="relative rounded-lg overflow-hidden bg-inverse-surface border border-outline-variant flex-1 min-h-[180px]">
              <img
                alt="Vista de cámara submarina del estanque con cardumen alimentándose"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBs8RjwxFs5sWzdnYnDliwrAtM5pfIZ6JWgKD2ArbViWRBcNRhUscdOdjNGv6ip6EKx0BfuPySu9ogar6yM9xOzTZdpSV5LVzy4OylE3Q9AuzXl0V4ql1RcEEVpOJcZI2LzXwT2N7dJZd4R3oZke0nQ55AMm9oqkNFGJpwML1nZ-yOvKWLEp4Nc4PFuV5I1XtBB0K-1vyBdfd5QP570_pCfzLIr4Hvb89N5BBnILr9HerIwDASpd8czcw"
              />
              <div className="absolute inset-0 p-3 pointer-events-none flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="bg-inverse-surface/80 backdrop-blur-xs text-inverse-on-surface text-[11px] px-2 py-0.5 rounded font-mono border border-outline-variant/30">
                    AI ZONE: ACTIVIDAD DETECTADA [98.2%]
                  </span>
                  <span className="bg-inverse-surface/80 text-[#8FD1D9] text-[10px] px-1.5 py-0.5 rounded font-mono">PROFUNDIDAD: -1.80m</span>
                </div>
                <div className="self-center w-3/4 h-24 border border-dashed border-[#8FD1D9] rounded flex items-center justify-center bg-[#0D5C63]/10">
                  <span className="text-[10px] font-mono text-[#abeef6] bg-primary/80 px-1.5 py-0.5 rounded">FOCO INGESTA PRIMARIO</span>
                </div>
                <div className="flex justify-between items-end text-[10px] font-mono text-inverse-on-surface bg-inverse-surface/75 px-2 py-1 rounded">
                  <span>FPS: 30.0 • 1080p IR</span>
                  <span>LATENCIA: 24ms</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-surface-container flex items-center justify-between">
              <div>
                <p className="text-label-sm font-label-sm font-semibold text-on-surface">Micro-Dosis Adicional</p>
                <p className="text-body-sm font-body-sm text-secondary">Pulso manual 250g</p>
              </div>
              <button className="bg-[#D97706] hover:bg-[#b45309] active:scale-[0.98] text-white px-3 py-1.5 rounded-lg text-label-sm font-label-sm font-semibold shadow-sm flex items-center gap-1.5 transition-all">
                <span className="material-symbols-outlined text-base">bolt</span>
                <span>Dispensar Ahora</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
            <h4 className="text-label-md font-label-md font-semibold text-on-surface mb-2">Composición Nutricional Activa</h4>
            <div className="space-y-2 text-body-sm font-body-sm">
              <div className="flex justify-between items-center">
                <span className="text-secondary">Proteína Cruda (Harina de Krill + Alga)</span>
                <span className="font-semibold text-on-surface">46.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-secondary">Lípidos y Ácidos Grasos Omega-3</span>
                <span className="font-semibold text-on-surface">18.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-secondary">Humedad Máxima Permitida</span>
                <span className="font-semibold text-on-surface">&lt; 8.0%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event log */}
      <section className="bg-surface-container-lowest border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-container-high flex flex-wrap items-center justify-between gap-3 bg-surface">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">fact_check</span>
            <h2 className="text-headline-sm font-headline-sm text-on-surface">Registro en Vivo de Eventos y Verificaciones</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded text-label-sm font-label-sm text-secondary hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtrar por Severidad
            </button>
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded text-label-sm font-label-sm text-secondary hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">download</span>
              Exportar CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1F5F9] text-[#1E293B] text-label-sm font-label-sm uppercase tracking-wider border-b border-surface-container">
                <th className="px-5 py-3">Hora Local</th>
                <th className="px-4 py-3">Tipo de Evento</th>
                <th className="px-4 py-3">Dispositivo / Subsistema</th>
                <th className="px-4 py-3">Parámetros Medidos</th>
                <th className="px-4 py-3">Evaluación Bio-AI</th>
                <th className="px-5 py-3 text-right">Estado Verificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-body-sm font-body-sm text-on-surface">
              {EVENT_LOG.map((row) => (
                <tr key={row.time} className="hover:bg-surface transition-colors">
                  <td className="px-5 py-3.5 font-mono text-secondary">{row.time}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${row.dot}`}></span>
                      <span className="font-medium">{row.event}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-secondary">{row.device}</td>
                  <td className="px-4 py-3.5 font-mono">{row.params}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm ${row.eval.bg} ${row.eval.color} border ${row.eval.border}`}>
                      {row.eval.text}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-right font-medium ${row.status.color}`}>
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">{row.status.icon}</span>
                      {row.status.text}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-surface border-t border-surface-container flex flex-wrap items-center justify-between text-body-sm font-body-sm text-secondary">
          <span>Mostrando 4 de 128 registros del ciclo actual</span>
          <div className="flex items-center gap-2">
            <button disabled className="px-2 py-1 rounded border border-outline-variant hover:bg-surface-container disabled:opacity-50 text-label-sm font-label-sm">
              Anterior
            </button>
            <button className="px-2 py-1 rounded border border-outline-variant hover:bg-surface-container text-label-sm font-label-sm">Siguiente</button>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
