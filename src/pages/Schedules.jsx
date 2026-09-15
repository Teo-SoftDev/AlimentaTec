import React, { useState } from "react";
import AppLayout from "../components/AppLayout.jsx";
import PillToggle from "../components/PillToggle.jsx";
import NumberStepper from "../components/NumberStepper.jsx";

const MILESTONES = [
  {
    time: "07:00 AM",
    title: "Apertura Matutina",
    detail: "3.5 kg • Gránulos 3mm",
    status: "done",
    footer: "Ejecutado con éxito (42s)",
  },
  {
    time: "11:30 AM",
    title: "Micro-Pulso Mediodía",
    detail: "4.2 kg • Bio-Fortificado",
    status: "done",
    footer: "Ejecutado con éxito (38s)",
  },
  {
    time: "16:00 PM",
    title: "Alimentación Alta Tasa",
    detail: "4.5 kg • Ráfaga Neumática",
    status: "next",
    footer: "Faltan 01h 38m",
  },
  {
    time: "20:30 PM",
    title: "Dosificación Nocturna",
    detail: "2.6 kg • Flotación Lenta",
    status: "pending",
    footer: "Esperando secuencia previa",
  },
];

const TRIGGER_TYPES = [
  { id: "compuerta", title: "Compuerta Temporizada", detail: "Descarga por gravedad de compuerta guillotina servo-controlada." },
  { id: "neumatica", title: "Neumática por Ráfagas", detail: "Inyección por toberas de aire comprimido para dispersión amplia." },
  { id: "acustica", title: "Difusión Acústica Previa", detail: "Hidrófono emite tono bio-acústico 30s antes para agrupar cardumen." },
];

const AUTOMATIONS = [
  { time: "07:00 AM", title: "Apertura Diurna Matutina", days: "L, M, X, J, V, S, D", detail: "3.5 kg Guillotina", active: true },
  { time: "11:30 AM", title: "Micro-Pulso Mediodía", days: "L, M, X, J, V", detail: "4.2 kg Flotación", active: true },
  { time: "16:00 PM", title: "Alimentación Alta Tasa", days: "L, M, X, J, V", detail: "4.5 kg Ráfagas", active: true, highlighted: true },
  { time: "20:30 PM", title: "Dosificación Nocturna Suave", days: "Fin de semana", detail: "2.6 kg Acústica", active: false },
];

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export default function Schedules() {
  const [selectedDays, setSelectedDays] = useState(["L", "M", "X", "J", "V"]);
  const [triggerType, setTriggerType] = useState("neumatica");
  const [duration, setDuration] = useState(45);
  const [dose, setDose] = useState(4.5);
  const [viewMode, setViewMode] = useState("24h");

  function toggleDay(day) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  return (
    <AppLayout active="horarios" searchPlaceholder="Buscar parámetros, actuadores...">
      {/* Top bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-secondary text-label-sm font-label-sm uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-primary">nest_clock_farsight_analog</span>
            <span>Control de Alimentación Automatizada</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-primary tracking-tight">
            Programación Cronológica de Alimentación Automática
          </h1>
          <p className="text-body-sm font-body-sm text-secondary">
            Secuenciación algorítmica de micro-dosis, bio-sensores de seguridad y modulación de flujo hidrodinámico.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[280px]">
            <label className="block text-label-sm font-label-sm text-secondary mb-1">Estación de Destino</label>
            <div className="relative">
              <select className="w-full h-10 pl-9 pr-8 bg-surface-container-low border border-outline-variant rounded text-label-md font-label-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer">
                <option value="tm04">Tanque Marino 04 - Esturión &amp; Lubina</option>
                <option value="rt02">Recinto Terrestre Sabana 02</option>
              </select>
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[20px] text-primary pointer-events-none">water_ec</span>
              <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[20px] text-secondary pointer-events-none">arrow_drop_down</span>
            </div>
          </div>
          <div className="pt-5 flex items-center bg-surface-container-low p-1 rounded border border-outline-variant">
            {[
              { id: "semanal", label: "Semanal" },
              { id: "24h", label: "Calendario 24 Horas" },
              { id: "timeline", label: "Línea de Tiempo" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 rounded text-label-sm font-label-sm font-medium transition-colors ${
                  viewMode === v.id ? "bg-primary text-on-primary font-semibold shadow-sm" : "text-secondary hover:text-on-surface"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="pt-5">
            <button className="h-10 px-4 bg-primary-container hover:bg-primary text-on-primary rounded text-label-md font-label-md flex items-center gap-2 shadow-sm active:scale-[0.98] transition-all">
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>+ Crear Nuevo Horario Programado</span>
            </button>
          </div>
        </div>
      </div>

      {/* 24h timeline */}
      <section className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container-high pb-3">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">av_timer</span>
            </span>
            <div>
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Ciclo Diario 24H: Distribución Nutricional</h2>
              <p className="text-body-sm font-body-sm text-secondary">
                Ración total acumulada hoy: <strong className="text-primary font-semibold">14.8 kg</strong> de 18.0 kg recomendados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-label-sm font-label-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-primary-container"></span>
              <span className="text-secondary">Disparo Programado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-tertiary-fixed-dim"></span>
              <span className="text-secondary">Ventana de Enriquecimiento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-primary font-semibold">Hora Local Actual: 14:22</span>
            </div>
          </div>
        </div>

        <div className="relative pt-6 pb-4">
          <div className="h-3 w-full bg-surface-container rounded-full relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 bg-primary-container/20 w-[60%]"></div>
            <div className="absolute left-[29.1%] top-0 bottom-0 w-1.5 bg-primary-container" title="07:00 AM"></div>
            <div className="absolute left-[47.9%] top-0 bottom-0 w-1.5 bg-primary-container" title="11:30 AM"></div>
            <div className="absolute left-[66.6%] top-0 bottom-0 w-2.5 bg-amber-500 ring-2 ring-amber-200" title="16:00 PM (Próximo)"></div>
            <div className="absolute left-[85.4%] top-0 bottom-0 w-1.5 bg-primary-container" title="20:30 PM"></div>
          </div>
          <div className="absolute top-2 left-[59.8%] -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
            <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shadow">14:22 AHORA</span>
            <div className="w-0.5 h-6 bg-emerald-600"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {MILESTONES.map((m) => {
              if (m.status === "next") {
                return (
                  <div key={m.time} className="border-2 border-primary-container rounded p-3 bg-primary-fixed/20 relative shadow-sm">
                    <div className="absolute top-0 right-0 bg-primary-container text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">
                      PRÓXIMO DISPARO
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-label-sm font-label-sm px-2 py-0.5 rounded bg-primary-container text-white font-mono font-bold">{m.time}</span>
                    </div>
                    <div className="mt-2 text-label-md font-label-md text-primary font-bold">{m.title}</div>
                    <div className="text-body-sm font-body-sm text-secondary">{m.detail}</div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold">
                      <span className="material-symbols-outlined text-[14px] text-amber-600 animate-spin">timelapse</span>
                      <span>{m.footer}</span>
                    </div>
                  </div>
                );
              }
              const done = m.status === "done";
              return (
                <div key={m.time} className="border border-surface-container-high rounded p-3 bg-surface-container-low/50 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-label-sm font-label-sm px-2 py-0.5 rounded font-mono ${
                        done ? "bg-emerald-100 text-emerald-800" : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {m.time}
                    </span>
                    <span className={`material-symbols-outlined text-[18px] ${done ? "text-emerald-600" : "text-secondary"}`}>
                      {done ? "check_circle" : "pending"}
                    </span>
                  </div>
                  <div className="mt-2 text-label-md font-label-md text-on-surface">{m.title}</div>
                  <div className="text-body-sm font-body-sm text-secondary">{m.detail}</div>
                  <div className="mt-2 text-[11px] text-secondary font-medium">{m.footer}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Editor + automations */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 bg-surface-container-lowest p-6 rounded-xl border border-surface-container-high shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-surface-container-high pb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded bg-secondary-container text-on-secondary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">edit_calendar</span>
              </span>
              <div>
                <h3 className="text-headline-sm font-headline-sm text-on-surface">Editor de Parámetros de Disparo</h3>
                <p className="text-body-sm font-body-sm text-secondary">Configuración cinemática y telemetría de seguridad de dosis</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-secondary-container/60 text-primary text-label-sm font-label-sm font-semibold">Regla #E-104</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-label-sm font-label-sm text-secondary mb-1.5">Hora de Activación (24H)</label>
              <div className="relative">
                <input
                  className="h-10 w-full pl-3 pr-9 rounded border border-outline-variant bg-surface-container-low text-on-surface text-label-lg font-label-lg font-mono focus:border-primary focus:ring-1 focus:ring-primary"
                  type="text"
                  defaultValue="16:00"
                />
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-[20px] text-secondary">alarm</span>
              </div>
            </div>
            <div>
              <label className="block text-label-sm font-label-sm text-secondary mb-1.5">Régimen Biológico</label>
              <select className="h-10 w-full px-3 rounded border border-outline-variant bg-surface-container-low text-label-md font-label-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary">
                <option>Días específicos semanales</option>
                <option>Ciclo biológico continuo (24/7 ininterrumpido)</option>
                <option>Ajuste fotoperíodo (según sensor lumínico)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-label-sm font-label-sm text-secondary mb-2">Frecuencia Semanal de Repetición</label>
            <div className="flex items-center gap-2 flex-wrap">
              {WEEKDAYS.map((day) => {
                const active = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`w-10 h-10 rounded border text-label-md font-label-md font-bold transition-colors ${
                      active ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-low text-secondary hover:bg-surface-container"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
              <span className="text-body-sm font-body-sm text-secondary pl-2">
                {selectedDays.length === 5 && !selectedDays.includes("S") && !selectedDays.includes("D")
                  ? "Lunes a Viernes (5 días)"
                  : `${selectedDays.length} día(s) seleccionados`}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-label-sm font-label-sm text-secondary">Mecanismo Actuador de Disparo</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TRIGGER_TYPES.map((t) => {
                const active = triggerType === t.id;
                return (
                  <label
                    key={t.id}
                    className={`p-3 rounded cursor-pointer transition-colors block ${
                      active ? "border-2 border-primary-container bg-primary-fixed/20" : "border border-outline-variant hover:bg-surface-container-low"
                    }`}
                  >
                    <input
                      type="radio"
                      name="trigger_type"
                      checked={active}
                      onChange={() => setTriggerType(t.id)}
                      className="text-primary focus:ring-primary"
                    />
                    <div className={`mt-2 text-label-md font-label-md ${active ? "text-primary font-bold" : "text-on-surface"}`}>{t.title}</div>
                    <div className="text-[11px] text-secondary mt-1">{t.detail}</div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-label-sm font-label-sm text-secondary">Duración del Ciclo de Dispersión</label>
                <span className="text-label-sm font-label-sm text-primary font-bold">{duration} Segundos</span>
              </div>
              <NumberStepper
                formattedValue={`${duration} s`}
                onDecrement={() => setDuration((d) => Math.max(5, d - 5))}
                onIncrement={() => setDuration((d) => Math.min(180, d + 5))}
              />
              <p className="text-[11px] text-secondary mt-1">Cadencia suave de compuerta modulada para evitar estrés en esturión.</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-label-sm font-label-sm text-secondary">Volumen de Dosis / Masa</label>
                <span className="text-label-sm font-label-sm text-primary font-bold">{dose.toFixed(2)} kg</span>
              </div>
              <NumberStepper
                formattedValue={`${dose.toFixed(2)} kg`}
                onDecrement={() => setDose((d) => Math.max(0.5, Math.round((d - 0.25) * 100) / 100))}
                onIncrement={() => setDose((d) => Math.min(20, Math.round((d + 0.25) * 100) / 100))}
              />
              <p className="text-[11px] text-secondary mt-1">Tolva secundaria A2 con detector de atasco piezoeléctrico.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-label-sm font-label-sm text-secondary font-bold uppercase tracking-wider">Reglas Condicionales en Tiempo Real</label>
              <button className="text-primary text-label-sm font-label-sm font-semibold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Agregar Condición</span>
              </button>
            </div>
            <div className="flex items-start gap-3 p-3 bg-red-50/50 border border-red-200 rounded">
              <span className="material-symbols-outlined text-error text-[20px] mt-0.5">thermostat</span>
              <div className="flex-1 text-body-sm font-body-sm">
                <div className="font-semibold text-error text-label-md font-label-md">Suspender si temperatura de agua &gt; 24°C</div>
                <div className="text-secondary text-[12px] mt-0.5">
                  Previene anoxia alimentaria y fermentación bacteriana en fondo estanque. Sensor actual:{" "}
                  <span className="font-mono font-semibold text-on-surface">19.4°C (Normal)</span>.
                </div>
              </div>
              <button className="text-secondary hover:text-error transition-colors">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
            <div className="flex items-start gap-3 p-3 bg-teal-50/50 border border-teal-200 rounded">
              <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">air</span>
              <div className="flex-1 text-body-sm font-body-sm">
                <div className="font-semibold text-primary text-label-md font-label-md">Aumentar dispersión 10% si sensor de oxígeno &gt; 6.5 mg/L</div>
                <div className="text-secondary text-[12px] mt-0.5">
                  Metabolismo acelerado en cardumen activo. Lectura en sonda óptica:{" "}
                  <span className="font-mono font-semibold text-on-surface">7.1 mg/L (Óptimo)</span>.
                </div>
              </div>
              <button className="text-secondary hover:text-error transition-colors">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
            <button className="px-4 py-2 border border-outline text-secondary rounded hover:bg-surface-container-low text-label-md font-label-md transition-colors">
              Descartar Cambios
            </button>
            <button className="px-5 py-2 bg-primary-container text-on-primary hover:bg-primary rounded text-label-md font-label-md font-semibold shadow-sm active:scale-[0.98] transition-all">
              Guardar Horario en Firmware IoT
            </button>
          </div>
        </section>

        <section className="xl:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest border-2 border-primary/30 p-5 rounded-xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-label-sm font-label-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
                <span>PRÓXIMO EVENTO AUTOMATIZADO</span>
              </span>
              <span className="font-mono text-label-sm font-label-sm text-secondary">ID #SEQ-882</span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="text-headline-xl font-headline-xl text-primary font-mono tracking-tight">01:37:42</div>
                <div className="text-label-sm font-label-sm text-secondary">Cuenta regresiva hasta disparo programado (16:00)</div>
              </div>
              <div className="text-right">
                <div className="text-headline-sm font-headline-sm text-on-surface font-mono font-bold">4.50 kg</div>
                <div className="text-label-sm font-label-sm text-secondary">Dispersión calculada</div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[11px] text-secondary">
                <span>Nivel de tolva neumática (84%)</span>
                <span>38.2 kg disponibles</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full rounded-full w-[84%]"></div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-surface-container-high flex items-center gap-2">
              <button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 px-3 rounded text-label-sm font-label-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm">
                <span className="material-symbols-outlined text-[16px]">play_circle</span>
                <span>Forzar Disparo Manual Ahora</span>
              </button>
              <button className="px-3 py-2 border border-outline-variant hover:bg-surface-container text-secondary rounded text-label-sm font-label-sm flex items-center justify-center transition-colors" title="Pausar este disparo">
                <span className="material-symbols-outlined text-[18px]">pause</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                <h3 className="text-headline-sm font-headline-sm text-on-surface">Automatizaciones Activas</h3>
              </div>
              <span className="text-label-sm font-label-sm text-secondary font-mono">4 Rutinas en Memoria</span>
            </div>
            <div className="space-y-3">
              {AUTOMATIONS.map((a) => (
                <div
                  key={a.time}
                  className={`p-3.5 rounded flex items-center justify-between transition-colors ${
                    a.highlighted
                      ? "border-2 border-primary bg-primary-fixed/10"
                      : a.active
                      ? "border border-surface-container-high bg-surface hover:border-outline-variant"
                      : "border border-surface-container-high bg-surface/50 opacity-70"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-label-md font-label-md font-bold ${a.active ? "text-primary" : "text-secondary"}`}>{a.time}</span>
                      <span className={`text-label-sm font-label-sm font-semibold ${a.highlighted ? "text-primary font-bold" : a.active ? "text-on-surface" : "text-secondary"}`}>
                        {a.title}
                      </span>
                    </div>
                    <div className="text-[12px] text-secondary flex items-center gap-2">
                      <span>{a.days}</span>
                      <span>•</span>
                      <span>{a.detail}</span>
                    </div>
                  </div>
                  <PillToggle defaultChecked={a.active} />
                </div>
              ))}
            </div>
            <div className="p-3 rounded bg-surface-container border border-surface-container-high flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-700 text-[20px]">check_box</span>
              <div className="text-[12px] text-secondary">
                Sincronización RTC (Reloj en Tiempo Real) calibrado por NTP con <strong className="text-on-surface">latencia 12ms</strong>. Tolerancia de actuador: ±0.4s.
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
