// src/utils/demoData.js — Datos de demostración. Se muestran SOLO mientras la
// colección de Firestore correspondiente está vacía (y quedan marcados como demo).
import { PONDS } from "./constants.js";

const ago = (min) => new Date(Date.now() - min * 60_000);

export const DEMO_DEVICES = [
  { id: "SN-AQ8832", serial: "SN-AQ8832", name: "AquaFeed Pro-10", type: "tolva", pondId: "AQ-04", protocol: "LoRaWAN", firmware: "2.4.11", status: "online", battery: 95, rssi: -78, hopperPct: 82, lastSeen: ago(1), autoFeeding: true },
  { id: "SN-TF4109", serial: "SN-TF4109", name: "TerraFeeder Max-4", type: "tolva", pondId: "AQ-01", protocol: "WiFi", firmware: "2.4.9", status: "online", battery: 71, rssi: -64, hopperPct: 34, lastSeen: ago(2), autoFeeding: true },
  { id: "SN-CR0204", serial: "SN-CR0204", name: "Coral Reef Feeder", type: "tolva", pondId: "AQ-06", protocol: "WiFi", firmware: "2.3.0", status: "offline", battery: 18, rssi: -91, hopperPct: 68, lastSeen: ago(190), autoFeeding: false },
  { id: "SN-FS9981", serial: "SN-FS9981", name: "FeedStation X8", type: "tolva", pondId: "AQ-09", protocol: "4G", firmware: "2.4.11", status: "online", battery: 100, rssi: -85, hopperPct: 12, lastSeen: ago(0.5), autoFeeding: true },
  { id: "SN-PROBE01", serial: "SN-PROBE01", name: "Sonda AquaProbe", type: "sensor", pondId: "AQ-04", protocol: "LoRaWAN", firmware: "1.8.2", status: "online", battery: 88, rssi: -72, lastSeen: ago(1) },
];

export const DEMO_BATCHES = [
  { id: "TRT-2024-098", code: "TRT-2024-098", name: "Lote Trucha Arcoíris L-4", species: "Oncorhynchus mykiss", pondId: "AQ-04", stage: "crecimiento", population: 12680, avgWeightG: 1450, waterTempC: 14.2, feedType: "pellet", autoFeeding: true, quarantine: false, notes: "" },
  { id: "SAL-2024-011", code: "SAL-2024-011", name: "Lote Salmón S-1", species: "Salmo salar", pondId: "AQ-01", stage: "engorde", population: 8200, avgWeightG: 2100, waterTempC: 12.8, feedType: "pellet", autoFeeding: true, quarantine: false, notes: "" },
  { id: "TIL-2024-020", code: "TIL-2024-020", name: "Lote Tilapia T-2", species: "Oreochromis niloticus", pondId: "AQ-06", stage: "crecimiento", population: 15400, avgWeightG: 320, waterTempC: 24.1, feedType: "micro", autoFeeding: true, quarantine: false, notes: "" },
];

export const DEMO_SCHEDULES = [
  { id: "demo-1", name: "Apertura Matutina", pondId: "AQ-04", time: "07:00", days: ["L", "M", "X", "J", "V", "S", "D"], mechanism: "compuerta", durationSec: 42, doseKg: 3.5, enabled: true, conditions: [] },
  { id: "demo-2", name: "Micro-Pulso Mediodía", pondId: "AQ-04", time: "11:30", days: ["L", "M", "X", "J", "V"], mechanism: "acustica", durationSec: 38, doseKg: 4.2, enabled: true, conditions: [] },
  { id: "demo-3", name: "Alimentación Alta Tasa", pondId: "AQ-04", time: "16:00", days: ["L", "M", "X", "J", "V"], mechanism: "neumatica", durationSec: 45, doseKg: 4.5, enabled: true, conditions: [{ sensor: "oxygen", op: "<", value: 5.2, action: "pause" }] },
  { id: "demo-4", name: "Dosificación Nocturna Suave", pondId: "AQ-04", time: "20:30", days: ["S", "D"], mechanism: "acustica", durationSec: 60, doseKg: 2.6, enabled: false, conditions: [] },
];

export const DEMO_ALERTS = [
  { id: "a1", severity: "critical", metric: "oxygen", pond: "AQ-09", message: "Oxígeno disuelto bajo el umbral crítico (5.0 mg/L)", ts: ago(12) },
  { id: "a2", severity: "warning", metric: "temperature", pond: "AQ-06", message: "Temperatura elevada (24.1 °C) para la especie", ts: ago(47) },
  { id: "a3", severity: "warning", metric: "hopper", pond: "AQ-09", message: "Tolva FeedStation X8 al 12%: reabastecer", ts: ago(95) },
];

const demoActor = { email: "m.vargas@alimentatec.bio", role: "operador", sessionId: "demo-session" };
export const DEMO_AUDIT = [
  { id: "d1", type: "dispense_manual", severity: "info", target: "SN-AQ8832", details: { amountG: 250, pond: "AQ-04" }, ...demoActor, ts: ago(25) },
  { id: "d2", type: "schedule_change", severity: "info", target: "Alimentación Alta Tasa", details: { campo: "doseKg", antes: 4.0, despues: 4.5, pond: "AQ-04" }, ...demoActor, ts: ago(140) },
  { id: "d3", type: "telemetry_rejected", severity: "critical", target: "SN-PROBE01", details: { motivo: "Firma inválida (posible suplantación)", pond: "AQ-04" }, ...demoActor, ts: ago(300) },
  { id: "d4", type: "device_add", severity: "info", target: "SN-FS9981", details: { tipo: "tolva", pond: "AQ-09" }, email: "admin@alimentatec.bio", role: "admin", sessionId: "demo-admin", ts: ago(1500) },
  { id: "d5", type: "login", severity: "info", target: "", details: {}, ...demoActor, ts: ago(1700) },
  { id: "d6", type: "emergency_stop", severity: "critical", target: "ALL", details: { motivo: "Prueba de protocolo" }, email: "admin@alimentatec.bio", role: "admin", sessionId: "demo-admin", ts: ago(2900) },
];

/* ---------- producción diaria (reportes) ---------- */
function hash(str) {
  let h = 2166136261;
  for (const c of str) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildProduction({ from, to, ponds }) {
  const rows = [];
  const start = Date.parse(from + "T00:00:00Z");
  const end = Date.parse(to + "T00:00:00Z");
  for (let t = start; t <= end; t += 864e5) {
    const date = new Date(t).toISOString().slice(0, 10);
    ponds.forEach((pondId) => {
      const idx = Math.max(0, PONDS.findIndex((p) => p.id === pondId));
      const r = rng(hash(pondId + date));
      rows.push({
        date,
        pondId,
        feedKg: +(38 + idx * 7 + r() * 12).toFixed(1),
        fcr: +(1.05 + idx * 0.03 + r() * 0.22).toFixed(2),
        growthG: +(1.1 + r() * 1.0).toFixed(2),
        incidents: r() > 0.93 ? 1 + Math.floor(r() * 2) : 0,
      });
    });
  }
  return rows;
}
