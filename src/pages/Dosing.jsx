import React, { useState } from "react";
import AppLayout from "../components/AppLayout.jsx";
import NumberStepper from "../components/NumberStepper.jsx";

const HOPPERS = [
  {
    id: "A",
    color: "bg-primary",
    barColor: "bg-primary",
    level: 82,
    name: "Pellet Proteico 45/12",
    detail: "Extruido 3.2mm • Alta flotabilidad",
    percent: 60,
    grams: "150.0 g",
    gramsColor: "text-primary",
  },
  {
    id: "B",
    color: "bg-primary-container",
    barColor: "bg-primary-container",
    level: 64,
    name: "Suplemento Vitamínico/Mineral",
    detail: "Premezcla C+E+Zinc bioasimilable",
    percent: 30,
    grams: "75.0 g",
    gramsColor: "text-primary",
  },
  {
    id: "C",
    color: "bg-tertiary-container",
    barColor: "bg-tertiary-container",
    level: 41,
    name: "Medicación / Probiótico",
    detail: "Inmuno-estimulante Bacillus spp.",
    percent: 10,
    grams: "25.0 g",
    gramsColor: "text-tertiary",
  },
];

const ACTUATORS = [
  { name: "Sinfín Tolva A", status: "24V OK • 0.4A", ok: true },
  { name: "Sinfín Tolva B", status: "24V OK • 0.3A", ok: true },
  { name: "Micro-inyector C", status: "12V OK • 0.1A", ok: true },
  { name: "Vibrador Anti-bóveda", status: "En reposo", ok: false },
];

export default function Dosing() {
  const [portion, setPortion] = useState(250.0);
  const [calcMode, setCalcMode] = useState("biomasa");
  const [radius, setRadius] = useState(3.8);
  const [weightReadout, setWeightReadout] = useState("000.0");
  const [pulsing, setPulsing] = useState(false);

  function handlePulseTest() {
    if (pulsing) return;
    setPulsing(true);
    setWeightReadout("…");
    setTimeout(() => {
      setWeightReadout("249.4");
      setPulsing(false);
    }, 900);
  }

  function handleTare() {
    setWeightReadout("000.0");
  }

  return (
    <AppLayout active="dosificacion" searchPlaceholder="Buscar unidad o parámetro...">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-secondary-container text-on-secondary-fixed px-2 py-0.5 rounded text-label-sm font-label-sm uppercase tracking-wider">
              Bio-Control Acuático
            </span>
            <span className="flex items-center gap-1 text-label-sm font-label-sm text-secondary">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Enlace Activo Canbus 500kbps
            </span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">Configuración de Porciones y Calibración de Ración</h1>
          <p className="text-body-md font-body-md text-secondary">
            Ajuste micrométrico de tolvas dosificadoras, proporciones de dieta y balance de biomasa operativa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded p-1">
            <label className="text-label-sm font-label-sm text-secondary px-2">Dispensador:</label>
            <select className="bg-transparent text-label-md font-label-md text-on-surface border-0 focus:ring-0 py-1 pl-1 pr-6 cursor-pointer">
              <option>Estación Estanque #04 - Biorreactor Sur</option>
              <option>Estación Estanque #02 - Guardería</option>
              <option>Estación Jaula 11 - Salmón Atlántico</option>
            </select>
          </div>
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded p-1">
            <label className="text-label-sm font-label-sm text-secondary px-2">Especie:</label>
            <span className="text-label-md font-label-md text-primary font-semibold pr-2">Trucha Arcoíris (Fase Juvenil)</span>
          </div>
          <button className="bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded text-label-md font-label-md flex items-center gap-2 shadow transition-all active:scale-[0.98]">
            <span className="material-symbols-outlined text-base">cloud_upload</span>
            <span>Aplicar a Dispositivos</span>
          </button>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: portion controls */}
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-headline-sm font-headline-sm text-on-surface">Calibración de Gramaje por Evento</h2>
                <p className="text-body-sm font-body-sm text-secondary">
                  Configuración del tornillo sinfín electromecánico y precisión del pulso de descarga.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-label-sm font-label-sm font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Normal Operation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface-container-low rounded-lg border border-surface-container-high">
              <div className="md:col-span-2 flex flex-col justify-center">
                <span className="text-label-sm font-label-sm text-secondary uppercase tracking-wider">Peso de Ración Objetivo</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-data-metric font-data-metric text-primary">{portion.toFixed(1)}</span>
                  <span className="text-label-lg font-label-lg text-secondary">gramos / ciclo</span>
                  <span className="text-label-sm font-label-sm bg-surface-container px-2 py-0.5 rounded text-outline font-mono">± 2.0g tolerancia</span>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-label-sm font-label-sm text-secondary">
                    <span>50 g</span>
                    <span>150 g</span>
                    <span className="font-bold text-primary">{portion.toFixed(0)} g</span>
                    <span>350 g</span>
                    <span>500 g</span>
                  </div>
                  <input
                    className="w-full accent-primary h-2 bg-surface-variant rounded-lg cursor-pointer"
                    max="500"
                    min="50"
                    type="range"
                    value={portion}
                    onChange={(e) => setPortion(parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-surface-container-high md:pl-4 pt-3 md:pt-0">
                <span className="text-label-sm font-label-sm text-secondary">Ajuste de Precisión</span>
                <NumberStepper
                  formattedValue={`${portion.toFixed(1)} g`}
                  onDecrement={() => setPortion((p) => Math.max(50, Math.round((p - 0.5) * 10) / 10))}
                  onIncrement={() => setPortion((p) => Math.min(500, Math.round((p + 0.5) * 10) / 10))}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setPortion((p) => Math.max(50, p - 5))}
                    className="flex-1 py-1 text-label-sm font-label-sm bg-surface hover:bg-surface-container-high border border-outline-variant rounded"
                  >
                    -5g
                  </button>
                  <button
                    onClick={() => setPortion((p) => Math.min(500, p + 5))}
                    className="flex-1 py-1 text-label-sm font-label-sm bg-surface hover:bg-surface-container-high border border-outline-variant rounded"
                  >
                    +5g
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-surface-container-high pt-4">
              <label className="text-label-md font-label-md text-on-surface block mb-2">Modo de Cálculo de Ración Global</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded cursor-pointer ${
                    calcMode === "biomasa" ? "border-2 border-primary bg-secondary-container/20" : "border border-outline-variant hover:border-outline"
                  }`}
                >
                  <input type="radio" name="calc_mode" checked={calcMode === "biomasa"} onChange={() => setCalcMode("biomasa")} className="mt-1 text-primary focus:ring-primary" />
                  <div>
                    <div className="text-label-md font-label-md text-on-surface font-semibold">Porcentaje de Biomasa Total</div>
                    <div className="text-body-sm font-body-sm text-secondary">Ajusta dinámicamente según biomasa estimada (1.8% peso vivo diario).</div>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-3 p-3 rounded cursor-pointer ${
                    calcMode === "fija" ? "border-2 border-primary bg-secondary-container/20" : "border border-outline-variant hover:border-outline"
                  }`}
                >
                  <input type="radio" name="calc_mode" checked={calcMode === "fija"} onChange={() => setCalcMode("fija")} className="mt-1 text-primary focus:ring-primary" />
                  <div>
                    <div className="text-label-md font-label-md text-on-surface font-semibold">Ración Fija por Cabeza</div>
                    <div className="text-body-sm font-body-sm text-secondary">Dosis programada fija multiplicada por el censo de 4,250 especímenes.</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Card 2: hopper mix breakdown */}
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-headline-sm font-headline-sm text-on-surface">Composición de Dieta y Mezcla Multitolva</h2>
                <p className="text-body-sm font-body-sm text-secondary">Régimen nutricional activo para estanque #04. Suma total balanceada al 100%.</p>
              </div>
              <span className="text-label-sm font-label-sm font-mono bg-primary-fixed text-on-primary-fixed px-2 py-1 rounded font-bold">Total: 100% (250g)</span>
            </div>

            <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden flex">
              {HOPPERS.map((h) => (
                <div key={h.id} className={`${h.color} h-full transition-all duration-300`} style={{ width: `${h.percent}%` }} title={`Tolva ${h.id} (${h.percent}%)`}></div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {HOPPERS.map((h) => (
                <div key={h.id} className="border border-surface-container-high rounded-lg p-4 bg-surface-container-lowest hover:border-outline-variant transition-colors flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-label-md font-label-md font-bold text-on-surface">
                      <span className={`w-3 h-3 rounded-sm ${h.color} inline-block`}></span>
                      Tolva {h.id}
                    </span>
                    <span className="text-label-sm font-label-sm text-secondary font-mono">{h.level}% Nivel</span>
                  </div>
                  <div>
                    <div className="text-body-sm font-body-sm font-medium text-on-surface">{h.name}</div>
                    <div className="text-label-sm font-label-sm text-secondary">{h.detail}</div>
                  </div>
                  <div className="pt-2 border-t border-surface-container-high flex items-center justify-between">
                    <div className="text-data-metric font-data-metric text-on-surface text-xl">{h.percent}%</div>
                    <div className="text-right">
                      <span className={`text-label-md font-label-md font-bold ${h.gramsColor}`}>{h.grams}</span>
                      <div className="text-label-sm font-label-sm text-secondary">por ración</div>
                    </div>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                    <div className={`${h.barColor} h-1 rounded-full`} style={{ width: `${h.level}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: dispersion curve */}
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-headline-sm font-headline-sm text-on-surface">Curva de Dispersión Espacial y Cañón Esparcidor</h2>
                <p className="text-body-sm font-body-sm text-secondary">Variación de RPM de la turbina centrífuga para uniformidad del radio de alimentación.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-label-sm font-label-sm text-secondary">Estado Motor:</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-label-sm font-label-sm rounded font-medium">PWM Listo</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="bg-surface-container-low border border-surface-container-high rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden h-52">
                <div className="absolute w-44 h-44 rounded-full border border-dashed border-primary/20"></div>
                <div className="absolute w-32 h-32 rounded-full border border-dashed border-primary/35"></div>
                <div className="absolute w-20 h-20 rounded-full border border-primary/50 bg-primary/5"></div>
                <div className="relative z-10 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-sm">adjust</span>
                </div>
                <span className="relative z-10 mt-3 text-label-sm font-label-sm font-semibold text-primary">Radio Cobertura: {radius.toFixed(1)} metros</span>
                <span className="relative z-10 text-body-sm font-body-sm text-secondary text-[11px]">Área activa aproximada: 45.3 m²</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-label-md font-label-md text-on-surface">Radio de Dispersión</label>
                    <span className="font-mono text-label-md font-label-md text-primary font-bold">{radius.toFixed(1)} m</span>
                  </div>
                  <input
                    className="w-full accent-primary h-2 bg-surface-variant rounded cursor-pointer"
                    max="5.0"
                    min="1.5"
                    step="0.1"
                    type="range"
                    value={radius}
                    onChange={(e) => setRadius(parseFloat(e.target.value))}
                  />
                  <div className="flex justify-between text-label-sm font-label-sm text-secondary mt-1">
                    <span>1.5 m (Focalizado)</span>
                    <span>5.0 m (Máxima Cobertura)</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-label-md font-label-md text-on-surface">Variador Turbina (PWM)</label>
                    <span className="font-mono text-label-md font-label-md text-on-surface">1,820 RPM</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className="bg-primary-container h-full" style={{ width: "72%" }}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded border border-surface-container-high text-body-sm font-body-sm text-secondary">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-primary">waves</span>
                    Compensación por corriente de agua:
                  </span>
                  <span className="text-label-md font-label-md font-semibold text-on-surface">+12% Vector Norte</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Load cell test */}
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Prueba de Descarga</h2>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-label-sm font-label-sm rounded font-medium">Celda Tarada</span>
            </div>
            <p className="text-body-sm font-body-sm text-secondary">Sensor de celda de carga de galgas extensiométricas en tiempo real con tara automática.</p>
            <div className="bg-surface-container-low border border-surface-container-high rounded-lg p-4 text-center space-y-2">
              <span className="text-label-sm font-label-sm text-secondary uppercase tracking-wider block">Lectura Actual de Celda</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-data-metric font-data-metric text-on-surface text-3xl font-mono">{weightReadout}</span>
                <span className="text-label-lg font-label-lg text-secondary">g</span>
              </div>
              <div className="text-label-sm font-label-sm text-secondary flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Estabilidad: 99.8% (Ruido &lt;0.1g)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTare}
                className="w-full py-2 px-3 bg-surface hover:bg-surface-container-high border border-outline-variant text-on-surface rounded text-label-md font-label-md flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-base">scale</span>
                <span>Tarar Cero</span>
              </button>
              <button
                onClick={handlePulseTest}
                disabled={pulsing}
                className="w-full py-2 px-3 bg-tertiary-container hover:bg-tertiary text-on-tertiary rounded text-label-md font-label-md flex items-center justify-center gap-1 shadow-sm active:scale-[0.98] transition-all disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-base">play_arrow</span>
                <span>Pulsar 1 Ración</span>
              </button>
            </div>
            <div className="p-3 bg-surface-container-low rounded border border-surface-container-high space-y-1">
              <div className="flex justify-between text-body-sm font-body-sm">
                <span className="text-secondary">Última prueba:</span>
                <span className="font-mono text-on-surface">Hace 14 min</span>
              </div>
              <div className="flex justify-between text-body-sm font-body-sm">
                <span className="text-secondary">Dispersión real:</span>
                <span className="font-mono text-emerald-700 font-semibold">249.4 g (-0.24%)</span>
              </div>
              <div className="flex justify-between text-body-sm font-body-sm">
                <span className="text-secondary">Coef. Variación (CV):</span>
                <span className="font-mono text-on-surface">0.82% (Excelente)</span>
              </div>
            </div>
          </div>

          {/* Safety limits */}
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-tertiary">shield</span>
              <h2 className="text-headline-sm font-headline-sm">Límites de Seguridad</h2>
            </div>
            <p className="text-body-sm font-body-sm text-secondary">
              Límites inviolables para prevenir hipoxia, acumulación de amonio y eutrofización del lecho.
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-surface-container-low rounded border border-surface-container-high space-y-1">
                <div className="flex justify-between text-label-md font-label-md">
                  <span className="text-on-surface">Ración Máxima Diaria</span>
                  <span className="font-mono font-bold text-error">12.5 kg / día</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: "58%" }}></div>
                </div>
                <div className="flex justify-between text-label-sm font-label-sm text-secondary">
                  <span>Consumido hoy: 7.25 kg</span>
                  <span>Margen: 42% restante</span>
                </div>
              </div>
              <div className="p-3 bg-surface-container-low rounded border border-surface-container-high space-y-1">
                <div className="flex justify-between text-label-md font-label-md">
                  <span className="text-on-surface">Bloqueo por Oxígeno Disuelto</span>
                  <span className="font-mono font-bold text-primary">&lt; 5.2 mg/L</span>
                </div>
                <p className="text-body-sm font-body-sm text-secondary text-[11px]">Corta el flujo si la sonda óptica reporta estrés respiratorio en biomasa.</p>
              </div>
              <div className="p-3 bg-surface-container-low rounded border border-surface-container-high space-y-1">
                <div className="flex justify-between text-label-md font-label-md">
                  <span className="text-on-surface">Tiempo de Intervalo Mínimo</span>
                  <span className="font-mono font-bold text-on-surface">90 minutos</span>
                </div>
                <p className="text-body-sm font-body-sm text-secondary text-[11px]">Impide sobredosis por ráfagas consecutivas no espaciadas.</p>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-700 text-xl">verified_user</span>
              <div className="text-body-sm font-body-sm text-emerald-900">
                <span className="font-semibold block text-label-sm font-label-sm">Enclavamiento Activo</span>
                Todos los parámetros dentro del rango seguro para la especie.
              </div>
            </div>
          </div>

          {/* Actuator status table */}
          <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-4 shadow-sm">
            <h3 className="text-label-md font-label-md text-secondary uppercase tracking-wider mb-2">Actuadores de Dosificación</h3>
            <div className="divide-y divide-surface-container-high text-body-sm font-body-sm">
              {ACTUATORS.map((a) => (
                <div key={a.name} className="py-2 flex items-center justify-between">
                  <span className="text-on-surface font-medium">{a.name}</span>
                  <span className={`font-mono text-label-sm font-label-sm ${a.ok ? "text-emerald-600" : "text-secondary"}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
