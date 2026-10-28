// Mismos umbrales que el front (src/utils/thresholds.js) para alertar en el servidor.
export function statusFor(metric, v) {
  if (!Number.isFinite(v)) return "crit";
  switch (metric) {
    case "ph": return v >= 6.8 && v <= 8.0 ? "ok" : v >= 6.5 && v <= 8.5 ? "warn" : "crit";
    case "oxygen": return v >= 6.5 ? "ok" : v >= 5.2 ? "warn" : "crit";
    case "temperature": return v >= 10 && v <= 18 ? "ok" : v >= 8 && v <= 20 ? "warn" : "crit";
    case "waterLevel": return v >= 70 && v <= 98 ? "ok" : v >= 55 ? "warn" : "crit";
    default: return "warn";
  }
}
export const worst = (list) => (list.includes("crit") ? "crit" : list.includes("warn") ? "warn" : "ok");

export const ALERT_TEXT = {
  oxygen: (v) => `Oxígeno disuelto bajo el umbral crítico (${v} mg/L)`,
  temperature: (v) => `Temperatura fuera de rango crítico (${v} °C)`,
  ph: (v) => `pH fuera de rango crítico (${v})`,
  waterLevel: (v) => `Nivel de agua crítico (${v} %)`,
};
