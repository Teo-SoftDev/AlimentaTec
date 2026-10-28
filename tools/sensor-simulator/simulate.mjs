#!/usr/bin/env node
// Simulador de sensores de campo para AlimentaTec (sin dependencias, Node ≥ 18).
// Uso rápido:  node simulate.mjs --device SN-SIM001 --key <API_KEY> --pond AQ-04
// Todas las opciones también se aceptan como variables de entorno (ver --help).
import { randomBytes } from "node:crypto";

const HELP = `
AlimentaTec · Simulador de sensores

Opciones (argumento  |  variable de entorno  |  por defecto)
  --url <base>        ALIMENTATEC_API_URL   http://localhost:8080/api/v1
  --device <id>       ALIMENTATEC_DEVICE_ID   (obligatorio)  p. ej. SN-SIM001
  --key <apiKey>      ALIMENTATEC_API_KEY     (obligatorio salvo --mode bad-auth)
  --pond <id>         ALIMENTATEC_POND_ID     AQ-04
  --sensor <tipo>     multiparametric|temperature|ph|oxygen|level   multiparametric
  --interval <seg>    segundos entre lecturas                       5
  --count <n>         lecturas a enviar (0 = infinito)              12
  --mode <modo>       ver "Modos"                                   normal
  --jwt               intercambia la API key por un JWT de 15 min y lo usa
  --batch <n>         (modo offline) lecturas a bufferizar          10
  --seed <n>          semilla para resultados reproducibles
  --verbose           muestra el JSON enviado
  --help

Modos
  normal         valores realistas con ligera fluctuación aleatoria
  low-oxygen     oxígeno disuelto cae bajo el umbral crítico (<5,2 mg/L) → alerta roja
  high-temp      la temperatura sube a rango crítico (>20 °C)
  ph-drift       el pH deriva a zona ácida crítica (<6,5)
  low-level      el nivel de agua baja a zona crítica (<55 %)
  invalid        envía payloads inválidos (debe responder 422)
  bad-auth       usa una clave incorrecta (debe responder 401)
  replay         reenvía la misma lectura (la API debe responderla como "duplicate")
  burst          dispara peticiones sin pausa para probar el límite de tasa (429)
  offline        simula pérdida de red: acumula --batch lecturas con marca de tiempo
                 pasada y las envía de una vez a /telemetry/batch al reconectar
`;

const argv = process.argv.slice(2);
const flags = new Set(["jwt", "verbose", "help"]);
const opts = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith("--")) continue;
  const k = a.slice(2);
  opts[k] = flags.has(k) ? true : argv[++i];
}
if (opts.help) { console.log(HELP); process.exit(0); }

const env = process.env;
const cfg = {
  url: (opts.url || env.ALIMENTATEC_API_URL || "http://localhost:8080/api/v1").replace(/\/+$/, ""),
  device: opts.device || env.ALIMENTATEC_DEVICE_ID,
  key: opts.key || env.ALIMENTATEC_API_KEY,
  pond: opts.pond || env.ALIMENTATEC_POND_ID || "AQ-04",
  sensor: opts.sensor || "multiparametric",
  interval: Number(opts.interval ?? 5),
  count: Number(opts.count ?? 12),
  mode: opts.mode || "normal",
  batch: Number(opts.batch ?? 10),
  jwt: !!opts.jwt, verbose: !!opts.verbose,
};
const MODES = ["normal", "low-oxygen", "high-temp", "ph-drift", "low-level", "invalid", "bad-auth", "replay", "burst", "offline"];
const fail = (m) => { console.error(`✖ ${m}\n  Use --help para ver las opciones.`); process.exit(2); };
if (!cfg.device) fail("Falta --device (o ALIMENTATEC_DEVICE_ID).");
if (!MODES.includes(cfg.mode)) fail(`Modo desconocido: ${cfg.mode}`);
if (!cfg.key && cfg.mode !== "bad-auth") fail("Falta --key (o ALIMENTATEC_API_KEY).");
if (!/^[A-Z]{2}-\d{2}$/.test(cfg.pond)) fail("--pond debe tener el formato AQ-04.");

// PRNG reproducible (mulberry32)
let seed = opts.seed !== undefined ? Number(opts.seed) >>> 0 : (randomBytes(4).readUInt32LE() >>> 0);
const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const jitter = (amp) => (rand() - 0.5) * 2 * amp;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

// Estado físico simulado
const hour = new Date().getHours() + new Date().getMinutes() / 60;
const state = { temperature: 14.2 + 1.2 * Math.sin(((hour - 9) / 24) * 2 * Math.PI), ph: 7.4, oxygen: 7.8, waterLevel: 86, step: 0 };

function nextReading(step) {
  const mode = cfg.mode;
  const tTarget = mode === "high-temp" ? 22.5 : 14.2 + 1.2 * Math.sin(((hour + step / 720 - 9) / 24) * 2 * Math.PI);
  const phTarget = mode === "ph-drift" ? 6.1 : 7.4;
  const doTarget = mode === "low-oxygen" ? 3.8 : 7.8 - Math.max(0, state.temperature - 14) * 0.18; // más calor → menos O₂
  const lvTarget = mode === "low-level" ? 42 : 86;
  const speed = ["low-oxygen", "high-temp", "ph-drift", "low-level"].includes(mode) ? 0.45 : 0.15;
  state.temperature += (tTarget - state.temperature) * speed + jitter(0.08);
  state.ph += (phTarget - state.ph) * speed + jitter(0.03);
  state.oxygen += (doTarget - state.oxygen) * speed + jitter(0.12);
  state.waterLevel += (lvTarget - state.waterLevel) * speed + jitter(0.4);
  const r = {
    temperature: round(clamp(state.temperature, -5, 45), 2), ph: round(clamp(state.ph, 0, 14), 2),
    oxygen: round(clamp(state.oxygen, 0, 25), 2), waterLevel: round(clamp(state.waterLevel, 0, 100), 1),
  };
  switch (cfg.sensor) {
    case "temperature": return { temperature: r.temperature };
    case "ph": return { ph: r.ph };
    case "oxygen": return { oxygen: r.oxygen };
    case "level": return { waterLevel: r.waterLevel };
    default: return r;
  }
}

const mkPayload = (step, ts) => ({
  readingId: "sim" + randomBytes(7).toString("hex"), pondId: cfg.pond, sensorType: cfg.sensor,
  ...(ts ? { ts } : {}), readings: nextReading(step),
  battery: Math.max(5, 96 - Math.floor(step / 20)), rssi: Math.round(-72 + jitter(6)), firmware: "2.4.11",
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let token = null;
async function call(path, body, { key = cfg.key } = {}) {
  const auth = token || key || "x".repeat(32);
  const res = await fetch(cfg.url + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Device-Id": cfg.device, Authorization: `Bearer ${auth}` }, body: JSON.stringify(body) });
  let json = {}; try { json = await res.json(); } catch { /* cuerpo vacío */ }
  return { status: res.status, json, retry: res.headers.get("retry-after") };
}

const summary = { sent: 0, accepted: 0, duplicate: 0, rejected: 0, throttled: 0, unauthorized: 0, errors: 0 };
function report(label, r, payload) {
  summary.sent++;
  const s = r.status;
  const tag = s === 202 ? "✔ aceptada" : s === 200 ? `✔ ${r.json.status || "ok"}` : s === 401 ? "✖ no autorizado" : s === 422 ? "✖ inválida" : s === 429 ? `⏳ límite (reintentar en ${r.retry || "?"}s)` : `✖ ${s}`;
  if (s === 202) summary.accepted++; else if (s === 200 && r.json.status === "duplicate") summary.duplicate++; else if (s === 200) summary.accepted++;
  else if (s === 401) summary.unauthorized++; else if (s === 422) summary.rejected++; else if (s === 429) summary.throttled++; else summary.errors++;
  const vals = payload?.readings ? Object.entries(payload.readings).map(([k, v]) => `${k}=${v}`).join(" ") : "";
  console.log(`[${new Date().toLocaleTimeString("es", { hour12: false })}] ${label} ${tag} ${vals}${r.json.pondStatus ? ` · estanque: ${r.json.pondStatus}` : ""}${r.json.error ? ` · ${r.json.error}` : ""}`);
  if (cfg.verbose) console.log("   →", JSON.stringify(payload), "\n   ←", JSON.stringify(r.json));
}

async function main() {
  console.log(`AlimentaTec · simulador  dispositivo=${cfg.device} estanque=${cfg.pond} sensor=${cfg.sensor} modo=${cfg.mode} → ${cfg.url}`);
  if (cfg.jwt && cfg.mode !== "bad-auth") {
    const r = await call("/auth/token", {});
    if (r.status !== 200) fail(`No se pudo obtener el JWT (HTTP ${r.status}: ${r.json.error || "?"}).`);
    token = r.json.token;
    console.log(`✔ JWT obtenido (expira en ${r.json.expiresIn}s)`);
  }

  if (cfg.mode === "offline") {
    console.log(`⚠ Simulando pérdida de red: acumulando ${cfg.batch} lecturas…`);
    const buf = [];
    for (let i = 0; i < cfg.batch; i++) buf.push(mkPayload(i, Date.now() - (cfg.batch - i) * Math.max(cfg.interval, 1) * 1000));
    await sleep(Math.min(cfg.interval, 3) * 1000);
    console.log("✔ Red restablecida: enviando lote (incluye una lectura repetida para probar idempotencia)");
    buf.push(buf[0]);
    const r = await call("/telemetry/batch", { readings: buf });
    summary.sent++; summary.accepted += r.json.accepted || 0; summary.duplicate += r.json.duplicates || 0; summary.rejected += r.json.rejected || 0;
    console.log(`   lote: ${r.json.accepted ?? 0} aceptadas · ${r.json.duplicates ?? 0} duplicadas · ${r.json.rejected ?? 0} rechazadas (HTTP ${r.status})`);
    return;
  }

  const total = cfg.mode === "burst" ? Math.max(cfg.count, 60) : cfg.count;
  for (let i = 0; total === 0 || i < total; i++) {
    let payload = mkPayload(i);
    if (cfg.mode === "invalid") payload = [{ ...payload, readings: { ph: 99 } }, { ...payload, extra: "x" }, { ...payload, pondId: "bad id" }, { ...payload, readings: {} }][i % 4];
    const r = await call("/telemetry", payload, cfg.mode === "bad-auth" ? { key: "clave-incorrecta-" + "x".repeat(20) } : {});
    report(`#${i + 1}`, r, payload);
    if (cfg.mode === "replay") report(`#${i + 1} (repetida)`, await call("/telemetry", payload), payload);
    if (r.status === 429 && cfg.mode !== "burst") await sleep(Number(r.retry || 5) * 1000);
    else if (cfg.mode !== "burst") await sleep(cfg.interval * 1000);
  }
}

process.on("SIGINT", () => { printSummary(); process.exit(0); });
function printSummary() {
  console.log(`\nResumen: ${summary.sent} peticiones · ${summary.accepted} aceptadas · ${summary.duplicate} duplicadas · ${summary.rejected} rechazadas · ${summary.unauthorized} no autorizadas · ${summary.throttled} limitadas · ${summary.errors} errores`);
}
main().then(printSummary).catch((e) => { console.error("✖ Error de red:", e.message); process.exit(1); });
