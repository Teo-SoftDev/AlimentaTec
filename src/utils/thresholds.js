// src/utils/thresholds.js — Umbrales de calidad de agua (verde/amarillo/rojo).
export const WATER_METRICS = {
  ph: { label: "pH", unit: "", decimals: 2, icon: "science" },
  oxygen: { label: "Oxígeno disuelto", unit: "mg/L", decimals: 1, icon: "air" },
  temperature: { label: "Temperatura", unit: "°C", decimals: 1, icon: "thermostat" },
  turbidity: { label: "Turbidez", unit: "NTU", decimals: 1, icon: "opacity" },
  waterLevel: { label: "Nivel de agua", unit: "%", decimals: 0, icon: "water" },
};

export function statusFor(metric, v) {
  if (!Number.isFinite(v)) return "crit";
  switch (metric) {
    case "ph":
      return v >= 6.8 && v <= 8.0 ? "ok" : v >= 6.5 && v <= 8.5 ? "warn" : "crit";
    case "oxygen":
      return v >= 6.5 ? "ok" : v >= 5.2 ? "warn" : "crit";
    case "temperature":
      return v >= 10 && v <= 18 ? "ok" : v >= 8 && v <= 20 ? "warn" : "crit";
    case "turbidity":
      return v <= 3 ? "ok" : v <= 5 ? "warn" : "crit";
    case "waterLevel":
      return v >= 70 && v <= 98 ? "ok" : v >= 55 ? "warn" : "crit";
    default:
      return "warn";
  }
}

export const STATUS_STYLES = {
  ok: { label: "Óptimo", pill: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]", bar: "bg-[#059669]", text: "text-[#065F46]", icon: "check_circle" },
  warn: { label: "Alerta", pill: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]", bar: "bg-[#D97706]", text: "text-[#92400E]", icon: "warning" },
  crit: { label: "Crítico", pill: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]", bar: "bg-[#DC2626]", text: "text-[#991B1B]", icon: "error" },
};

export const worstStatus = (list) => (list.includes("crit") ? "crit" : list.includes("warn") ? "warn" : "ok");
