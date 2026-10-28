import assert from "node:assert/strict";
const V = await import("../src/utils/validation.js");
const T = await import("../src/utils/telemetry.js");
const C = await import("../src/utils/crypto.js");
const ok = (s, d) => assert.equal(s.safeParse(d).success, true, JSON.stringify(s.safeParse(d).error?.issues?.[0]));
const bad = (s, d, why) => assert.equal(s.safeParse(d).success, false, "debía fallar: " + why);

// contraseñas
bad(V.passwordSchema, "corta1!A", "corta"); bad(V.passwordSchema, "sinsimbolo1234AB", "sin símbolo"); ok(V.passwordSchema, "Str0ng!Passw0rd");
// login / registro
ok(V.loginSchema, { email: " A@B.co ", password: "x" }); bad(V.loginSchema, { email: "no-email", password: "x" }, "email");
ok(V.registerSchema, { nombre: "María Vargas", email: "m@a.co", password: "Str0ng!Passw0rd", confirm: "Str0ng!Passw0rd", terms: true });
bad(V.registerSchema, { nombre: "<script>", email: "m@a.co", password: "Str0ng!Passw0rd", confirm: "Str0ng!Passw0rd", terms: true }, "nombre con HTML");
bad(V.registerSchema, { nombre: "Ana Pérez", email: "m@a.co", password: "Str0ng!Passw0rd", confirm: "otra", terms: true }, "confirm");
bad(V.registerSchema, { nombre: "Ana Pérez", email: "m@a.co", password: "Str0ng!Passw0rd", confirm: "Str0ng!Passw0rd", terms: false }, "terms");
// dispositivos
const dev = { serial: "sn-aq8832", name: "AquaFeed Pro-10", type: "tolva", pondId: "AQ-04", protocol: "LoRaWAN", firmware: "2.4.11" };
ok(V.deviceSchema, dev); assert.equal(V.deviceSchema.parse(dev).serial, "SN-AQ8832");
bad(V.deviceSchema, { ...dev, serial: "'; DROP TABLE" }, "serial inyección"); bad(V.deviceSchema, { ...dev, pondId: "../etc" }, "pond"); bad(V.deviceSchema, { ...dev, name: "<img onerror=x>" }, "nombre html");
ok(V.qrPayloadSchema, { v: 1, serial: "SN-AQ8832", type: "tolva", fw: "2.4.11" }); bad(V.qrPayloadSchema, { v: 2, serial: "SN-AQ8832" }, "versión");
// lotes: sin negativos ni desbordes
const batch = { code: "trt-2024-098", name: "Lote Trucha", species: "Oncorhynchus mykiss", pondId: "AQ-04", stage: "crecimiento", population: 1000, avgWeightG: 100, waterTempC: 15, feedType: "pellet", autoFeeding: true, quarantine: false, notes: "ok <b>x</b>" };
ok(V.batchSchema, batch); assert.equal(V.batchSchema.parse(batch).notes, "ok bx/b");
bad(V.batchSchema, { ...batch, population: -5 }, "negativo"); bad(V.batchSchema, { ...batch, population: 2e9 }, "desborde"); bad(V.batchSchema, { ...batch, avgWeightG: 0 }, "peso 0"); bad(V.batchSchema, { ...batch, population: 10.5 }, "no entero"); bad(V.batchSchema, { ...batch, population: NaN }, "NaN");
// horarios
const sch = { name: "Apertura", pondId: "AQ-04", time: "07:00", days: ["L", "M"], mechanism: "neumatica", durationSec: 45, doseKg: 4.5, enabled: true, conditions: [{ sensor: "oxygen", op: "<", value: 5.2, action: "pause" }] };
ok(V.scheduleSchema, sch); bad(V.scheduleSchema, { ...sch, time: "25:00" }, "hora"); bad(V.scheduleSchema, { ...sch, days: [] }, "días"); bad(V.scheduleSchema, { ...sch, doseKg: 500 }, "dosis"); bad(V.scheduleSchema, { ...sch, doseKg: -1 }, "dosis negativa");
// dosificación
const dos = { deviceId: "SN-AQ8832", portionG: 250, mode: "biomasa", radiusM: 3.8, hoppers: [{ id: "A", percent: 60 }, { id: "B", percent: 30 }, { id: "C", percent: 10 }] };
ok(V.dosingSchema, dos); bad(V.dosingSchema, { ...dos, hoppers: [{ id: "A", percent: 60 }, { id: "B", percent: 30 }, { id: "C", percent: 20 }] }, "suma 110"); bad(V.dosingSchema, { ...dos, portionG: 9999 }, "porción");
// comandos
ok(V.commandSchema, { type: "emergency_stop", deviceId: "ALL" }); bad(V.commandSchema, { type: "dispense_manual", deviceId: "ALL", amountG: 100 }, "ALL no emergencia"); bad(V.commandSchema, { type: "dispense_manual", deviceId: "SN-1", amountG: 99999 }, "monto"); bad(V.commandSchema, { type: "rm_rf", deviceId: "SN-1" }, "tipo");
// reportes
ok(V.reportFilterSchema, { metrics: ["feed"], from: "2024-01-01", to: "2024-02-01", ponds: ["AQ-01"] });
bad(V.reportFilterSchema, { metrics: ["feed"], from: "2024-02-01", to: "2024-01-01", ponds: ["AQ-01"] }, "rango invertido"); bad(V.reportFilterSchema, { metrics: ["feed"], from: "2020-01-01", to: "2024-01-01", ponds: ["AQ-01"] }, "rango >366");
bad(V.reportFilterSchema, { metrics: ["$where"], from: "2024-01-01", to: "2024-02-01", ponds: ["AQ-01"] }, "métrica no permitida"); bad(V.reportFilterSchema, { metrics: ["feed"], from: "2024-01-01", to: "2024-02-01", ponds: ["AQ-01'||1==1"] }, "pond inyección"); bad(V.reportFilterSchema, { metrics: ["feed"], from: "2024-13-45", to: "2024-02-01", ponds: ["AQ-01"] }, "fecha");
// historial
ok(V.historyFilterSchema, { from: "", to: "", type: "all", pond: "", q: "texto" }); bad(V.historyFilterSchema, { from: "", to: "", type: "x; DROP", pond: "", q: "" }, "type");

// telemetría firmada
const dev1 = await T.createSimulatedDevice("SN-PROBE01"); const ver = new T.TelemetryVerifier(); await ver.registerDevice("SN-PROBE01", dev1.publicJwk);
const rd = { ph: 7.4, oxygen: 7.8, temperature: 14.2, turbidity: 1.8 };
let { packet, signature } = await dev1.emit(rd); assert.equal((await ver.verify(packet, signature)).ok, true);
assert.equal((await ver.verify(packet, signature)).reason, "replay");
({ packet, signature } = await dev1.emit(rd, { tamper: true })); assert.equal((await ver.verify(packet, signature)).reason, "bad_signature");
({ packet, signature } = await dev1.emit(rd)); assert.equal((await ver.verify({ ...packet, deviceId: "SN-FAKE99" }, signature)).reason, "unknown_device");
({ packet, signature } = await dev1.emit(rd)); assert.equal((await ver.verify(packet, signature, Date.now() + 120000)).reason, "stale");
({ packet, signature } = await dev1.emit(rd)); assert.equal((await ver.verify({ ...packet, readings: { ...rd, ph: 99 } }, signature)).reason, "bad_schema");
console.log("ZOD + TELEMETRÍA: TODAS LAS PRUEBAS PASARON ✔");
