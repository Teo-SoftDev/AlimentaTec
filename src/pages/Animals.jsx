import React, { useState } from "react";
import AppLayout from "../components/AppLayout.jsx";

const FOOD_TYPES = [
  { id: "pellet", label: "Pellet flotante 4mm", detail: "42% Proteína / 18% Lípidos" },
  { id: "biomasa", label: "Biomasa húmeda controlada", detail: "Enriquecida con spirulina" },
  { id: "heno", label: "Heno enriquecido", detail: "Fibra larga + Calcio orgánico" },
  { id: "granulos", label: "Gránulos micro-extruidos", detail: "1.2mm Alta digestibilidad" },
];

const VET_PROTOCOLS = [
  {
    icon: "check_circle",
    iconColor: "text-[#065F46]",
    title: "Baño de inmersión profiláctico:",
    detail: "Completado sin anomalías el 12 de Mayo.",
  },
  {
    icon: "schedule",
    iconColor: "text-[#D97706]",
    title: "Monitoreo Lipídico en Hígado:",
    detail: "Programado para la próxima semana (Semana 14).",
  },
];

export default function Animals() {
  const [foodType, setFoodType] = useState("pellet");
  const [guardado, setGuardado] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  }

  return (
    <AppLayout active="animales" searchPlaceholder="Buscar por tag RFID, especie o ID de lote...">
      {/* Breadcrumb + Título */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2 text-secondary text-label-sm font-label-sm mb-1">
            <span>Bio-Gestión</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Expedientes Biológicos</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">
            Registro y Expediente Nutricional de Animales
          </h1>
          <p className="text-body-sm font-body-sm text-secondary mt-0.5">
            Control individual y por lote con enlace a servomotores y dosificadores automáticos.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="inline-flex items-center gap-2 border border-outline-variant bg-surface-container-lowest text-on-surface text-label-md font-label-md px-3.5 py-2 rounded hover:bg-surface-container transition-colors shadow-sm">
            <span className="material-symbols-outlined">file_download</span>
            Exportar CSV / HL7
          </button>
          <button className="inline-flex items-center gap-2 bg-primary text-on-primary text-label-md font-label-md px-4 py-2 rounded hover:bg-[#0A484E] active:bg-[#073539] transition-all shadow-sm active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add</span>
            + Registrar Nuevo Espécimen / Lote
          </button>
        </div>
      </div>

      {/* Toolbar de filtros */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          <div className="lg:col-span-1 relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-secondary text-[18px]">search</span>
            <input
              className="w-full pl-8 pr-3 py-1.5 h-10 bg-surface-container-low border border-outline-variant rounded text-body-sm font-body-sm text-on-surface form-focus-ring"
              placeholder="Filtrar por ID..."
              type="text"
            />
          </div>
          <div>
            <label className="block text-label-sm font-label-sm text-secondary mb-1">Hábitat</label>
            <select className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-body-sm text-on-surface form-focus-ring">
              <option>Todos (Acuático &amp; Terrestre)</option>
              <option>Acuático: Agua Dulce</option>
              <option>Acuático: Marino</option>
              <option>Terrestre: Zona Cálida</option>
              <option>Terrestre: Modular</option>
            </select>
          </div>
          <div>
            <label className="block text-label-sm font-label-sm text-secondary mb-1">Especie / Taxón</label>
            <select className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-body-sm text-on-surface form-focus-ring">
              <option>Todas las especies</option>
              <option>Oncorhynchus mykiss (Trucha)</option>
              <option>Zalophus californianus (Lobo M.)</option>
              <option>Cervus elaphus (Ciervo)</option>
              <option>Litopenaeus vannamei (Camarón)</option>
            </select>
          </div>
          <div>
            <label className="block text-label-sm font-label-sm text-secondary mb-1">Régimen Dieta</label>
            <select className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-body-sm text-on-surface form-focus-ring">
              <option>Cualquier régimen</option>
              <option>Pellet flotante 4mm</option>
              <option>Biomasa húmeda controlada</option>
              <option>Heno enriquecido con calcio</option>
              <option>Gránulos micro-extruidos 1.2mm</option>
            </select>
          </div>
          <div>
            <label className="block text-label-sm font-label-sm text-secondary mb-1">Estado de Salud</label>
            <select className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-body-sm text-on-surface form-focus-ring">
              <option>Todos los estados</option>
              <option>Óptimo / En Crecimiento</option>
              <option>En Cuarentena / Observación</option>
              <option>Ajuste Metabólico Requerido</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container text-label-sm font-label-sm text-secondary">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#065F46]"></span> 128 Lotes Activos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse"></span> 42 Dispensaciones Programadas Hoy
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-error"></span> 2 Restricciones Veterinarias
            </span>
          </div>
          <div className="text-secondary">
            Última sincronización telemetría: <span className="font-semibold text-on-surface">hace 3 min</span>
          </div>
        </div>
      </div>

      {/* Workspace: Formulario + Ficha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna izquierda: formulario */}
        <section className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">edit_note</span>
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Formulario de Alta Bio-Nutricional</h2>
            </div>
            <span className="bg-secondary-container text-on-secondary-fixed text-label-sm font-label-sm px-2.5 py-0.5 rounded-full font-medium">
              Nuevo Registro
            </span>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md font-label-md text-on-surface mb-1.5">
                  Código / Tag RFID <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[18px]">nfc</span>
                  <input
                    className="w-full pl-9 pr-3 h-10 border border-outline-variant rounded bg-surface-container-lowest text-on-surface font-body-md text-body-md font-mono form-focus-ring"
                    placeholder="ej. TRT-2024-098"
                    type="text"
                    defaultValue="TRT-2024-098"
                  />
                </div>
                <span className="text-label-sm font-label-sm text-secondary mt-1 block">
                  Frecuencia 134.2 kHz compatible ISO 11784
                </span>
              </div>
              <div>
                <label className="block text-label-md font-label-md text-on-surface mb-1.5">
                  Nombre Común / Identificador <span className="text-error">*</span>
                </label>
                <input
                  className="w-full px-3 h-10 border border-outline-variant rounded bg-surface-container-lowest text-on-surface font-body-md text-body-md form-focus-ring"
                  placeholder="ej. Lobo Marino 'Kibo' / Ciervo 'Atlas'"
                  type="text"
                  defaultValue="Lote Trucha Arcoíris L-4"
                />
                <span className="text-label-sm font-label-sm text-secondary mt-1 block">
                  Nombre clínico o denominación del estanque
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md font-label-md text-on-surface mb-1.5">Clasificación Taxonómica</label>
                <input
                  className="w-full px-3 h-10 border border-outline-variant rounded bg-surface-container-lowest text-on-surface italic font-body-md text-body-md form-focus-ring"
                  placeholder="ej. Zalophus californianus"
                  type="text"
                  defaultValue="Oncorhynchus mykiss"
                />
              </div>
              <div>
                <label className="block text-label-md font-label-md text-on-surface mb-1.5">
                  Categoría de Hábitat <span className="text-error">*</span>
                </label>
                <select className="w-full h-10 px-3 border border-outline-variant rounded bg-surface-container-lowest text-on-surface font-body-md text-body-md form-focus-ring">
                  <option value="ac-dulce">Acuático: Agua Dulce (Estanques / Raceway)</option>
                  <option value="ac-marina">Acuático: Marina (Jaulas Costeras)</option>
                  <option value="ter-herbi">Terrestre: Herbívoro (Rumiantes)</option>
                  <option value="ter-carni">Terrestre: Carnívoro</option>
                  <option value="ter-omni">Terrestre: Omnívoro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md font-label-md text-on-surface mb-1.5">
                  Peso Corporal Actual (o biomasa media)
                </label>
                <div className="flex">
                  <input
                    className="w-full px-3 h-10 border border-r-0 border-outline-variant rounded-l bg-surface-container-lowest text-on-surface font-body-md text-body-md form-focus-ring"
                    step="0.01"
                    type="number"
                    defaultValue="1.45"
                  />
                  <span className="inline-flex items-center px-3 border border-outline-variant bg-surface-container-low text-secondary text-label-md font-label-md rounded-r">
                    kg
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-label-md font-label-md text-on-surface mb-1.5">
                  Etapa Biológica / Estado Vital
                </label>
                <select className="w-full h-10 px-3 border border-outline-variant rounded bg-surface-container-lowest text-on-surface font-body-md text-body-md form-focus-ring">
                  <option>Crecimiento Acelerado (Engorde F2)</option>
                  <option>Mantenimiento Adulto</option>
                  <option>Gestación / Maduración Gametos</option>
                  <option>Alevinaje / Destete Temprano</option>
                  <option>Convalecencia Pos-tratamiento</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-label-md font-label-md text-on-surface">Dispensador IoT Asignado</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-primary text-[18px]">precision_manufacturing</span>
                <select className="w-full pl-9 pr-3 h-10 border border-outline-variant rounded bg-surface-container-lowest text-on-surface font-body-md text-body-md form-focus-ring">
                  <option>ALIM-IOT-04 • Módulo Acuícola Flotante (Tolva Norte 350L - 94% tolva)</option>
                  <option>ALIM-IOT-02 • Dosificador de Tornillo Sin-Fin Estanque B (65% tolva)</option>
                  <option>ALIM-IOT-09 • Estación Neumática Recinto Ciervos (82% tolva)</option>
                  <option>ALIM-IOT-11 • Muelle Alimentador Marino Canal Este (18% tolva - Alerta)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[#065F46]"></span>
                <span className="text-label-sm font-label-sm text-[#065F46] font-medium">
                  Dispositivo en línea, latencia 42ms con sensor de flujo activo
                </span>
              </div>
            </div>

            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1.5">
                Tipo de Alimento Requerido &amp; Textura
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FOOD_TYPES.map((food) => {
                  const active = foodType === food.id;
                  return (
                    <label
                      key={food.id}
                      className={`flex items-center gap-3 p-2.5 border rounded cursor-pointer hover:bg-surface-container-low transition-colors ${
                        active ? "bg-secondary-container/20 border-primary" : "border-outline-variant"
                      }`}
                    >
                      <input
                        type="radio"
                        name="food_type"
                        checked={active}
                        onChange={() => setFoodType(food.id)}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <div>
                        <span className="block text-label-md font-label-md text-on-surface">{food.label}</span>
                        <span className="block text-label-sm font-label-sm text-secondary">{food.detail}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1.5">
                Notas Veterinarias y Restricciones Nutricionales
              </label>
              <textarea
                className="w-full p-3 border border-outline-variant rounded bg-surface-container-lowest text-on-surface font-body-md text-body-md form-focus-ring"
                placeholder="Indique contraindicaciones, alergias, períodos de ayuno previo a muestreo o dosificación de inmunoestimulantes..."
                rows={3}
                defaultValue="Mantener saturación de oxígeno disuelto > 6.5 mg/L antes de la ración matutina. Suspender ración de las 18:00 hrs si la temperatura del agua supera los 17.5°C para evitar estrés digestivo."
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-container-high">
              <span className={`text-label-sm font-label-sm text-success transition-opacity ${guardado ? "opacity-100" : "opacity-0"}`}>
                Registro guardado y vinculado a la telemetría.
              </span>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 border border-outline text-secondary hover:text-on-surface rounded text-label-md font-label-md transition-colors" type="reset">
                  Restablecer
                </button>
                <button
                  className="px-5 py-2 bg-primary text-on-primary rounded text-label-md font-label-md hover:bg-[#0A484E] active:bg-[#073539] transition-all shadow-sm"
                  type="submit"
                >
                  Guardar y Vincular Telemetría
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Columna derecha: ficha nutricional + protocolos */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm space-y-5 relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-label-sm font-label-sm text-secondary uppercase tracking-wider font-semibold">Ficha Activa</span>
                  <span className="px-2 py-0.5 rounded text-label-sm font-label-sm font-medium bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                    Normal Operation
                  </span>
                </div>
                <h3 className="text-headline-md font-headline-md text-on-surface mt-1">Lote Trucha Arcoíris L-4</h3>
                <p className="text-body-sm font-body-sm text-secondary italic font-serif">
                  Oncorhynchus mykiss • RFID: TRT-2024-098
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">water_drop</span>
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-outline-variant h-36 bg-surface-container">
              <img
                alt="Estanque de Trucha Arcoíris L-4"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIwHdp2oCmZ_BO2--_d8awF0QsV5x5pFUOQ89wzYlzGBcyOSgMT9mhijhlM5HhxO7Vqbxo9wKPnVSuFneQfp0QrE3TyOq9F8nOP1g592_EDQ8W88IERVk53U7TGlMGyIa2ajnVUBWjc4Fi7Q2G3WtJTxcDxwHF1u3EiV2250rwtT73wVnVqxdFXIQIjLCqDk61RN-U5khAj8nuztxegJ3_LHgc1WYxpTcbQ76kk-l9eAk0vgyzze9tDA"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                <div className="text-white text-label-sm font-label-sm flex items-center justify-between w-full">
                  <span>Estanque Raceway #04 • Sector Acuícola</span>
                  <span className="bg-primary/80 px-2 py-0.5 rounded text-[11px] backdrop-blur-sm">Cámara HD Sensor Activo</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-label-md font-label-md text-on-surface font-semibold">Cálculo de Ingesta Diaria Automática</span>
                <span className="material-symbols-outlined text-secondary text-sm">calculate</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant/40">
                  <span className="block text-label-sm font-label-sm text-secondary">Ración Total Diaria</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-data-metric font-data-metric text-primary">18.4</span>
                    <span className="text-label-md font-label-md text-secondary">kg/día</span>
                  </div>
                  <span className="text-[11px] text-secondary">~1.27% peso biomasa</span>
                </div>
                <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant/40">
                  <span className="block text-label-sm font-label-sm text-secondary">Frecuencia / Pulsos</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-data-metric font-data-metric text-on-surface">6</span>
                    <span className="text-label-md font-label-md text-secondary">dosis/día</span>
                  </div>
                  <span className="text-[11px] text-secondary">3.06 kg por ciclo</span>
                </div>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-label-sm font-label-sm">
                  <span className="text-secondary">Nivel de Tolva (ALIM-IOT-04)</span>
                  <span className="font-semibold text-primary">94% (329 kg restantes)</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "94%" }}></div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-label-lg font-label-lg text-on-surface">Curva de Ganancia Ponderal (g)</h4>
                  <p className="text-label-sm font-label-sm text-secondary">Real vs. Modelo Von Bertalanffy</p>
                </div>
                <div className="flex items-center gap-3 text-label-sm font-label-sm">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-1 bg-primary rounded-full"></span> Real
                  </span>
                  <span className="flex items-center gap-1 text-secondary">
                    <span className="w-2.5 h-1 bg-outline-variant rounded-full"></span> Proyectado
                  </span>
                </div>
              </div>
              <div className="w-full h-40 bg-surface-container-low rounded-lg p-2 border border-outline-variant/50 relative flex items-end">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 320 120">
                  <line stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="320" y1="30" y2="30"></line>
                  <line stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="320" y1="60" y2="60"></line>
                  <line stroke="#CBD5E1" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="320" y1="90" y2="90"></line>
                  <path d="M 10 105 Q 80 85 160 55 T 310 18" fill="none" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth="2"></path>
                  <defs>
                    <linearGradient id="curveGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#004349" stopOpacity="0.25"></stop>
                      <stop offset="100%" stopColor="#004349" stopOpacity="0.0"></stop>
                    </linearGradient>
                  </defs>
                  <path d="M 10 105 L 60 92 L 120 78 L 180 52 L 240 38 L 290 22 L 290 115 L 10 115 Z" fill="url(#curveGradient)"></path>
                  <path d="M 10 105 L 60 92 L 120 78 L 180 52 L 240 38 L 290 22" fill="none" stroke="#004349" strokeWidth="2.5"></path>
                  <circle cx="10" cy="105" fill="#004349" r="3"></circle>
                  <circle cx="60" cy="92" fill="#004349" r="3"></circle>
                  <circle cx="120" cy="78" fill="#004349" r="3"></circle>
                  <circle cx="180" cy="52" fill="#004349" r="3"></circle>
                  <circle cx="240" cy="38" fill="#004349" r="3"></circle>
                  <circle className="animate-ping origin-center" cx="290" cy="22" fill="#004349" opacity="0.4" r="4"></circle>
                  <circle cx="290" cy="22" fill="#004349" r="4"></circle>
                </svg>
                <div className="absolute bottom-1 inset-x-3 flex justify-between text-[10px] text-secondary font-mono">
                  <span>Sem 01</span>
                  <span>Sem 04</span>
                  <span>Sem 08</span>
                  <span>Sem 12 (Hoy)</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-surface-container-low p-2 rounded">
                  <span className="block text-[11px] text-secondary">FCR Acumulado</span>
                  <span className="font-bold text-on-surface text-body-md font-mono">1.12</span>
                </div>
                <div className="bg-surface-container-low p-2 rounded">
                  <span className="block text-[11px] text-secondary">SGR (%/día)</span>
                  <span className="font-bold text-primary text-body-md font-mono">+1.84%</span>
                </div>
                <div className="bg-surface-container-low p-2 rounded">
                  <span className="block text-[11px] text-secondary">Supervivencia</span>
                  <span className="font-bold text-[#065F46] text-body-md font-mono">98.6%</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-secondary-container/30 border border-secondary-container rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary">bolt</span>
                <div>
                  <span className="block text-label-md font-label-md text-on-surface">Dispensación Manual Inmediata</span>
                  <span className="block text-label-sm font-label-sm text-secondary">Pulso de prueba 250g vía IoT</span>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-[#0D5C63] text-white hover:bg-[#0A484E] active:bg-[#073539] text-label-sm font-label-sm rounded transition-all shadow-sm">
                Dispensar Ahora
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-label-lg font-label-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-base">medical_services</span>
                Protocolos Veterinarios Activos
              </h4>
              <span className="text-label-sm font-label-sm text-secondary">Dr. R. Arispe (M.V.)</span>
            </div>
            <ul className="divide-y divide-surface-container text-body-sm font-body-sm">
              {VET_PROTOCOLS.map((p) => (
                <li key={p.title} className="py-2 flex items-start gap-2.5">
                  <span className={`material-symbols-outlined text-sm mt-0.5 ${p.iconColor}`}>{p.icon}</span>
                  <div>
                    <span className="font-semibold text-on-surface">{p.title}</span> <span className="text-secondary">{p.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
