// src/simulator/occurrences.js — Cálculo puro de ocurrencias de horarios (tipo cron).
const DAY = ["D", "L", "M", "X", "J", "V", "S"];
export const pad = (n) => String(n).padStart(2, "0");
export const dateKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function occFor(s, atMs, prefix) {
  return {
    id: `${prefix}${s.id}_${dateKey(atMs)}_${s.time.replace(":", "")}`, // clave determinista → idempotencia entre pestañas / reconexiones
    scheduleId: s.id, scheduleName: s.name, pondId: s.pondId, time: s.time, atMs,
    doseKg: s.doseKg, durationSec: s.durationSec, mechanism: s.mechanism, conditions: s.conditions || [],
  };
}

/** Ocurrencias en el intervalo (fromMs, toMs]. */
export function occurrencesBetween(schedules, fromMs, toMs, { prefix = "" } = {}) {
  const out = [];
  if (!(toMs > fromMs)) return out;
  const d = new Date(fromMs);
  d.setHours(0, 0, 0, 0);
  for (; d.getTime() <= toMs; d.setDate(d.getDate() + 1)) {
    const letter = DAY[d.getDay()];
    for (const s of schedules) {
      if (!s.enabled || !s.days?.includes(letter) || !/^\d{2}:\d{2}$/.test(s.time || "")) continue;
      const at = new Date(d);
      at.setHours(+s.time.slice(0, 2), +s.time.slice(3, 5), 0, 0);
      const atMs = at.getTime();
      if (atMs > fromMs && atMs <= toMs) out.push(occFor(s, atMs, prefix));
    }
  }
  return out.sort((a, b) => a.atMs - b.atMs || a.id.localeCompare(b.id));
}

/** Próxima ocurrencia posterior a nowMs (hasta 8 días). */
export function nextOccurrence(schedules, nowMs, pondId = null) {
  const list = schedules.filter((s) => !pondId || s.pondId === pondId);
  return occurrencesBetween(list, nowMs, nowMs + 8 * 86_400_000)[0] || null;
}

const LABELS = { oxygen: "oxígeno", temperature: "temperatura", ph: "pH", turbidity: "turbidez" };

/** Aplica las reglas por sensor del horario. */
export function decideDose(occ, readings) {
  let dose = occ.doseKg;
  const notes = [];
  for (const c of occ.conditions || []) {
    const v = readings?.[c.sensor];
    if (!Number.isFinite(v)) continue;
    if (!(c.op === "<" ? v < c.value : v > c.value)) continue;
    const why = `${LABELS[c.sensor] || c.sensor} ${v} ${c.op} ${c.value}`;
    if (c.action === "pause") return { action: "skip", dose: 0, reason: why };
    dose *= c.action === "reduce" ? 0.8 : 1.1;
    notes.push(`${c.action === "reduce" ? "dosis -20%" : "dosis +10%"} (${why})`);
  }
  return { action: "run", dose: Math.min(50, Math.round(dose * 100) / 100), reason: notes.join("; ") };
}
