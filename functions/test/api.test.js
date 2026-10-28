import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { startServer } from "../src/server.js";
import { createMemoryStore } from "../src/stores/memoryStore.js";
import { sha256Hex } from "../src/security.js";

const KEY = randomBytes(24).toString("base64url");
const JWT = randomBytes(32).toString("hex");
let ctx, base, store, now = Date.now();

test.before(async () => {
  store = createMemoryStore();
  store.addDevice({ id: "SN-SIM001", type: "sensor", pondId: "AQ-04", status: "offline" }, sha256Hex(KEY));
  store.addDevice({ id: "SN-TOLVA1", type: "tolva", pondId: "AQ-04", status: "online" }, sha256Hex("t".repeat(30)));
  store.addDevice({ id: "SN-REVOKE", type: "sensor", pondId: "AQ-04", status: "revoked" }, "");
  ctx = await startServer({ store, ws: false, jwtSecret: () => JWT, clock: () => now, env: { API_DEVICE_RATE_MAX: "5", API_AUTHFAIL_MAX: "4", API_AUDIT_DEBOUNCE_MS: "0", API_IP_RATE_MAX: "1000" } });
  base = `http://127.0.0.1:${ctx.port}/api/v1`;
});
test.after(() => ctx.close());

const hdr = (id = "SN-SIM001", key = KEY) => ({ "Content-Type": "application/json", "X-Device-Id": id, Authorization: `Bearer ${key}` });
const reading = (o = {}) => ({ readingId: "r" + randomBytes(6).toString("hex"), pondId: "AQ-04", readings: { temperature: 14.2, ph: 7.4, oxygen: 7.8 }, ...o });
const post = (path, body, headers = hdr()) => fetch(base + path, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });

test("health sin autenticación y con cabeceras de seguridad", async () => {
  const r = await fetch(base + "/health");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("access-control-allow-origin"), null);
});

test("acepta telemetría válida, actualiza estanque y dispositivo", async () => {
  const r = await post("/telemetry", reading({ battery: 90, rssi: -70 }));
  assert.equal(r.status, 202);
  const j = await r.json();
  assert.equal(j.status, "accepted"); assert.equal(j.pondStatus, "ok");
  assert.equal(store._devices.get("SN-SIM001").status, "online");
  assert.equal(store._pond.get("AQ-04").metrics.oxygen.value, 7.8);
});

test("idempotencia: el mismo readingId no se duplica", async () => {
  const body = reading();
  assert.equal((await post("/telemetry", body)).status, 202);
  const r2 = await post("/telemetry", body);
  assert.equal(r2.status, 200); assert.equal((await r2.json()).status, "duplicate");
});

test("oxígeno crítico genera alerta con antirrebote", async () => {
  const before = store._state.alerts.length;
  await post("/telemetry", reading({ readings: { oxygen: 3.9 } }));
  await post("/telemetry", reading({ readings: { oxygen: 3.7 } }));
  assert.equal(store._state.alerts.length, before + 1);
  assert.equal(store._state.alerts.at(-1).severity, "critical");
  assert.equal(store._pond.get("AQ-04").status, "crit");
});

test("A03: rechaza campos desconocidos, rangos imposibles y JSON roto", async () => {
  now += 120_000;
  assert.equal((await post("/telemetry", { ...reading(), extra: "x" })).status, 422);
  assert.equal((await post("/telemetry", reading({ readings: { ph: 99 } }))).status, 422);
  assert.equal((await post("/telemetry", reading({ readings: { oxygen: -1 } }))).status, 422);
  assert.equal((await post("/telemetry", reading({ pondId: "AQ-04'; DROP" }))).status, 422);
  assert.equal((await post("/telemetry", "{no-json")).status, 400);
  const r = await post("/telemetry", reading({ readings: { ph: "7" } })); assert.equal(r.status, 422);
});

test("A03: tipo de contenido y tamaño máximo", async () => {
  const r = await fetch(base + "/telemetry", { method: "POST", headers: { ...hdr(), "Content-Type": "text/plain" }, body: "x" });
  assert.equal(r.status, 415);
  const big = await post("/telemetry", { ...reading(), pad: "x".repeat(20000) });
  assert.ok([413, 422].includes(big.status));
});

test("A07: dispositivo desconocido, clave errónea y revocado dan la MISMA respuesta 401", async () => {
  const a = await post("/telemetry", reading(), hdr("SN-NOEXIST", KEY));
  const b = await post("/telemetry", reading(), hdr("SN-SIM001", "x".repeat(30)));
  const c = await post("/telemetry", reading(), hdr("SN-REVOKE", "y".repeat(30)));
  const [ja, jb, jc] = [await a.json(), await b.json(), await c.json()];
  assert.deepEqual([a.status, b.status, c.status], [401, 401, 401]);
  assert.equal(ja.message, jb.message); assert.equal(jb.message, jc.message);
  assert.ok(!JSON.stringify(ja).includes("revocado"));
});

test("autorización: tolva no puede enviar telemetría; estanque ajeno rechazado", async () => {
  now += 120_000;
  assert.equal((await post("/telemetry", reading(), hdr("SN-TOLVA1", "t".repeat(30)))).status, 403);
  assert.equal((await post("/telemetry", reading({ pondId: "AQ-01" }))).status, 403);
});

test("A04: límite de tasa por dispositivo (429 + Retry-After)", async () => {
  now += 10 * 60_000; // ventana nueva
  let last;
  for (let i = 0; i < 7; i++) last = await post("/telemetry", reading());
  assert.equal(last.status, 429);
  assert.ok(Number(last.headers.get("retry-after")) >= 1);
});

test("JWT: intercambio por token y uso; token manipulado rechazado", async () => {
  now += 10 * 60_000;
  const t = await (await post("/auth/token", {})).json();
  assert.ok(t.token.startsWith("eyJ"));
  assert.equal((await post("/telemetry", reading(), hdr("SN-SIM001", t.token))).status, 202);
  const tampered = t.token.slice(0, -3) + (t.token.endsWith("AAA") ? "BBB" : "AAA");
  assert.equal((await post("/telemetry", reading(), hdr("SN-SIM001", tampered))).status, 401);
  const noneAlg = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from('{"sub":"SN-SIM001"}').toString("base64url")}.`;
  assert.equal((await post("/telemetry", reading(), hdr("SN-SIM001", noneAlg))).status, 401);
  now += 20 * 60_000; // expira
  assert.equal((await post("/telemetry", reading(), hdr("SN-SIM001", t.token))).status, 401);
});

test("lote offline: acepta, deduplica y rechaza lo inválido; no pisa datos más recientes", async () => {
  now += 10 * 60_000;
  const old = reading({ ts: now - 3600_000, readings: { oxygen: 9.9 } });
  const fresh = reading({ ts: now - 1000, readings: { oxygen: 7.0 } });
  const bad = reading({ ts: now + 3600_000 });
  const r = await post("/telemetry/batch", { readings: [fresh, old, old, bad] });
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.accepted, 2); assert.equal(j.duplicates, 1); assert.equal(j.rejected, 1);
  assert.equal(store._pond.get("AQ-04").metrics.oxygen.value, 7.0);
});

test("A09: fallos de autenticación auditados con cadena íntegra y alerta de fuerza bruta", async () => {
  const before = store._state.audit.length;
  for (let i = 0; i < 6; i++) await post("/telemetry", reading(), hdr("SN-SIM001", "z".repeat(25 + i)));
  assert.ok(store._state.audit.length > before);
  assert.ok(store._state.audit.some((e) => e.type === "api_auth_failed"));
  assert.ok(store._state.securityAlerts.some((a) => a.kind === "api_bruteforce"));
  const chk = await import("node:crypto");
  const { canonicalize } = await import("../src/security.js");
  let prev = "GENESIS", seq = 0;
  for (const e of store._state.audit) {
    const { hash, ...body } = e;
    assert.equal(e.seq, ++seq); assert.equal(e.prevHash, prev);
    assert.equal(chk.createHash("sha256").update(canonicalize(body)).digest("hex"), hash);
    prev = hash;
  }
  const last = await post("/telemetry", reading(), hdr("SN-SIM001", "q".repeat(30)));
  assert.equal(last.status, 429); // IP bloqueada tras exceder fallos
});

test("sin CORS ni métodos distintos de POST; rutas desconocidas 404", async () => {
  assert.equal((await fetch(base + "/telemetry", { method: "GET" })).status, 405);
  assert.equal((await fetch(base + "/telemetry", { method: "OPTIONS" })).status, 405);
  assert.equal((await fetch(base + "/admin")).status, 404);
});

test("watchdog: sensores sin señal pasan a offline y se avisa", async () => {
  store._devices.get("SN-SIM001").lastSeenMs = 1; store._devices.get("SN-SIM001").status = "online";
  const n = await ctx.api.service.markStaleOffline();
  assert.ok(n >= 1);
  assert.equal(store._devices.get("SN-SIM001").status, "offline");
});
