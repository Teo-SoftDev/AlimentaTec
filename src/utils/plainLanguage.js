// src/utils/plainLanguage.js — Lenguaje natural para el cuidador (baja carga cognitiva).
// Regla: nada de jerga técnica. Cada estado se explica con una palabra y un color.
import { statusFor, worstStatus } from "./thresholds.js";

export const SEMAPHORE = {
  ok: { label: "Todo bien", icon: "check_circle", solid: "bg-green-600 text-white", soft: "bg-green-50 border-green-300 text-green-900", ring: "ring-green-600", text: "text-green-700" },
  warn: { label: "Precaución", icon: "warning", solid: "bg-amber-500 text-black", soft: "bg-amber-50 border-amber-400 text-amber-950", ring: "ring-amber-500", text: "text-amber-800" },
  crit: { label: "Actúe ahora", icon: "error", solid: "bg-red-600 text-white", soft: "bg-red-50 border-red-400 text-red-950", ring: "ring-red-600", text: "text-red-700" },
};

export const WATER_HEADLINE = {
  ok: "Agua en buen estado",
  warn: "Revise el agua pronto",
  crit: "¡Agua en mal estado! Actúe ahora",
};

export const DEVICE_WORDS = { online: "Conectado", offline: "Sin conexión", revoked: "Desactivado", none: "Sin sensor" };

const NAMES = { oxygen: "Aire en el agua", temperature: "Temperatura del agua", ph: "Equilibrio del agua", turbidity: "Claridad del agua", waterLevel: "Nivel del agua" };
const ICONS = { oxygen: "air", temperature: "thermostat", ph: "science", turbidity: "opacity", waterLevel: "water" };

export function describeMetric(metric, value) {
  const status = statusFor(metric, value);
  let word = "Bien";
  if (status !== "ok") {
    if (metric === "oxygen") word = status === "warn" ? "Un poco bajo" : "Muy bajo";
    else if (metric === "temperature") word = value > 15 ? (status === "warn" ? "Algo caliente" : "Muy caliente") : status === "warn" ? "Algo fría" : "Muy fría";
    else if (metric === "ph") word = status === "warn" ? "Algo desequilibrada" : "Muy desequilibrada";
    else if (metric === "turbidity") word = status === "warn" ? "Algo turbia" : "Muy turbia";
    else if (metric === "waterLevel") word = value < 70 ? (status === "warn" ? "Un poco baja" : "Muy baja") : "Demasiado alta";
  } else if (metric === "temperature") word = "Agradable";
  return { metric, name: NAMES[metric], icon: ICONS[metric], status, word };
}

export function summarizePond(readings) {
  const parts = Object.entries(readings || {}).filter(([m]) => NAMES[m]).map(([m, v]) => describeMetric(m, v));
  const status = parts.length ? worstStatus(parts.map((p) => p.status)) : "warn";
  return { status, headline: parts.length ? WATER_HEADLINE[status] : "Sin datos del agua todavía", parts };
}

// Qué debe hacer el cuidador ante cada alerta (pasos graficados en los avisos).
export function guidanceFor(metric, status, pond) {
  const crit = status === "crit";
  const base = {
    oxygen: { title: crit ? `Falta aire en el agua · ${pond}` : `Poco aire en el agua · ${pond}`, steps: [{ icon: "block", text: "No dé más comida por ahora" }, { icon: "mode_fan", text: "Compruebe que el aireador esté encendido" }, { icon: "call", text: "Avise al supervisor si no mejora" }] },
    temperature: { title: `Temperatura del agua fuera de lo normal · ${pond}`, steps: [{ icon: "wb_shade", text: "Dé sombra al estanque si puede" }, { icon: "block", text: "No dé más comida por ahora" }, { icon: "call", text: "Avise al supervisor" }] },
    ph: { title: `El agua está desequilibrada · ${pond}`, steps: [{ icon: "visibility", text: "Mire si los peces se ven tranquilos" }, { icon: "call", text: "Avise al supervisor para corregirla" }] },
    waterLevel: { title: `Nivel del agua bajo · ${pond}`, steps: [{ icon: "valve", text: "Abra la llave para rellenar el estanque" }, { icon: "call", text: "Avise al supervisor si sigue bajando" }] },
    hopper: { title: `Se acaba la comida · ${pond}`, steps: [{ icon: "inventory_2", text: "Rellene la tolva de alimento" }, { icon: "call", text: "Avise al supervisor si no hay más" }] },
    sensor: { title: `El sensor no responde · ${pond}`, steps: [{ icon: "visibility", text: "Mire el estanque con sus propios ojos" }, { icon: "power", text: "Revise que el sensor tenga energía" }, { icon: "call", text: "Avise al supervisor" }] },
  };
  return base[metric] || { title: `Aviso en ${pond}`, steps: [{ icon: "call", text: "Avise al supervisor" }] };
}

export const fmtClock = (d) => d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
export function inWords(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 1) return "menos de 1 minuto";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
