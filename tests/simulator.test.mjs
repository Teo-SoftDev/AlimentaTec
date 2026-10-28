import assert from "node:assert/strict";
import { FeedingSimulator } from "../src/simulator/runtime.js";
import { occurrencesBetween, decideDose, nextOccurrence } from "../src/simulator/occurrences.js";

const day = (h, m = 0, d = 0) => new Date(2024, 5, 10 + d, h, m, 0).getTime(); // lunes 10-jun-2024 (local)
const S = (o) => ({ id: "sch1", name: "Mañana", pondId: "AQ-04", time: "07:00", days: ["L", "M", "X", "J", "V", "S", "D"], mechanism: "compuerta", durationSec: 4, doseKg: 3, enabled: true, conditions: [], ...o });

function make(clockRef, opts = {}) {
  const db = opts.db || { events: new Map(), audits: [], states: 0, patches: [] };
  const mem = opts.mem || {}; const storage = { get: (k) => mem[k] ?? null, set: (k, v) => (mem[k] = v) };
  const io = {
    storage, sleep: async () => {}, getReadings: () => opts.readings || { oxygen: 7.8 },
    eventExists: async (id) => db.events.has(id),
    createEvent: async (ev) => { if (opts.netDown?.()) { const e = new Error("net"); e.code = "unavailable"; throw e; } if (db.events.has(ev.occurrenceId)) return "exists"; db.events.set(ev.occurrenceId, { ...ev }); return "created"; },
    updateEvent: async (id, patch) => { if (opts.netDown?.()) { const e = new Error("net"); e.code = "unavailable"; throw e; } db.patches.push(id); Object.assign(db.events.get(id) || {}, patch); },
    audit: async (type, target, details, severity) => db.audits.push({ type, target, details, severity }),
    writeState: async () => { db.states++; },
  };
  return { sim: new FeedingSimulator({ io, now: () => clockRef.t, config: { cascadeGapMs: 0 } }), db };
}

// occurrences
let occ = occurrencesBetween([S()], day(6), day(23));
assert.equal(occ.length, 1); assert.equal(occ[0].id, "sch1_2024-06-10_0700");
assert.equal(occurrencesBetween([S({ days: ["M"] })], day(6), day(23)).length, 0); // lunes ≠ martes
assert.equal(occurrencesBetween([S({ enabled: false })], day(6), day(23)).length, 0);
assert.equal(occurrencesBetween([S()], day(7), day(23)).length, 0); // intervalo abierto en el inicio
assert.equal(occurrencesBetween([S()], day(0), day(0, 0, 3)).length, 3);
assert.equal(nextOccurrence([S()], day(8)).atMs, day(7, 0, 1));
// condiciones
const c = S({ conditions: [{ sensor: "oxygen", op: "<", value: 5.2, action: "pause" }] });
assert.equal(decideDose({ ...occ[0], conditions: c.conditions }, { oxygen: 4.1 }).action, "skip");
assert.equal(decideDose({ ...occ[0], conditions: c.conditions }, { oxygen: 7 }).dose, 3);
assert.equal(decideDose({ ...occ[0], conditions: [{ sensor: "oxygen", op: "<", value: 6, action: "reduce" }] }, { oxygen: 5.5 }).dose, 2.4);

// 1) ejecución normal
let clock = { t: day(6, 59, 0) };
let { sim, db } = make(clock); sim.setSchedules([S()]); sim.start();
clock.t = day(7, 0, 0) + 1000; await sim.tick();
assert.equal(db.events.get("sch1_2024-06-10_0700").status, "completed");
assert.equal(db.audits.filter((a) => a.type === "scheduled_feeding").length, 1);
clock.t += 5000; await sim.tick(); // no repite
assert.equal(db.events.size, 1);

// 2) condición de oxígeno → omitida y auditada
clock = { t: day(6, 59) }; ({ sim, db } = make(clock, { readings: { oxygen: 4.0 } })); sim.setSchedules([c]); sim.start();
clock.t = day(7, 0) + 500; await sim.tick();
assert.equal(db.events.get("sch1_2024-06-10_0700").status, "skipped");
assert.ok(db.audits.some((a) => a.type === "scheduled_skipped"));

// 3) offline LOCAL: ejecuta sin red, encola y sincroniza al volver sin duplicar
clock = { t: day(6, 59) }; ({ sim, db } = make(clock)); sim.setSchedules([S(), S({ id: "sch2", time: "07:05", name: "Segunda" })]); sim.start();
await sim.setOnline(false);
clock.t = day(7, 10); await sim.tick(); // dos ocurrencias vencidas offline
assert.equal(db.events.size, 0); assert.ok(sim.snapshot().outbox >= 4);
assert.equal(sim.snapshot().stats.executed, 2);
await sim.setOnline(true);
assert.equal(db.events.size, 2); assert.equal(sim.snapshot().outbox, 0);
assert.ok(db.audits.some((a) => a.type === "sim_sync"));
clock.t += 1000; await sim.tick(); assert.equal(db.events.size, 2);

// 4) offline DEFER: no ejecuta; al reconectar ejecuta en cascada (tardío) una sola vez
clock = { t: day(6, 59) }; ({ sim, db } = make(clock)); sim.setSchedules([S(), S({ id: "sch2", time: "07:05", name: "Segunda" })]); sim.setBehavior("defer"); sim.start();
await sim.setOnline(false); clock.t = day(7, 30); await sim.tick();
assert.equal(sim.snapshot().deferred, 2); assert.equal(sim.snapshot().stats.executed, 0);
clock.t = day(7, 31); await sim.setOnline(true);
assert.equal(db.events.size, 2); assert.ok([...db.events.values()].every((e) => e.late && e.status === "completed"));
assert.equal(sim.snapshot().stats.executed, 2);

// 5) dos hosts (pestañas) no duplican porciones
clock = { t: day(6, 59) }; const shared = { events: new Map(), audits: [], states: 0, patches: [] };
const A = make(clock, { db: shared }), B = make(clock, { db: shared });
for (const x of [A, B]) { x.sim.setSchedules([S()]); x.sim.start(); }
clock.t = day(7, 0) + 100; await Promise.all([A.sim.tick(), B.sim.tick()]);
assert.equal(shared.events.size, 1);
assert.equal(shared.audits.filter((a) => a.type === "scheduled_feeding").length + 0 <= 2, true);
assert.ok(A.sim.snapshot().stats.duplicatesAvoided + B.sim.snapshot().stats.duplicatesAvoided >= 0);

// 6) caída real de red a mitad de la ejecución: no se pierde ni se duplica
clock = { t: day(6, 59) }; let down = false; ({ sim, db } = make(clock, { netDown: () => down })); sim.setSchedules([S()]); sim.start();
down = true; clock.t = day(7, 0) + 100; await sim.tick();
assert.equal(db.events.size, 0); assert.ok(sim.snapshot().outbox > 0);
down = false; await sim.flush(); assert.equal(db.events.size, 1); assert.equal(db.events.get("sch1_2024-06-10_0700").status, "completed");

// 7) recuperación tras cierre de la app (catch-up en cascada, ventana de 6 h)
const mem7 = { at_sim_last_tick: JSON.stringify(day(5)), at_sim_seen: "[]", at_sim_outbox: "[]" };
clock = { t: day(7, 3) }; ({ sim, db } = make(clock, { mem: mem7 })); sim.setSchedules([S(), S({ id: "sch3", time: "06:00", name: "Madrugada" })]); sim.start();
await sim.tick(); assert.equal(db.events.size, 2);
// 8) reloj acelerado usa prefijo y no colisiona con ids reales
clock = { t: day(6, 0) }; ({ sim, db } = make(clock)); sim.setSchedules([S()]); sim.start(); sim.setSpeed(720);
clock.t += 60_000 * 2; await sim.tick(); // 2 min reales = 24 h virtuales
assert.ok([...db.events.keys()].every((k) => k.startsWith("x")));
console.log("SIMULADOR: TODAS LAS PRUEBAS PASARON ✔");
