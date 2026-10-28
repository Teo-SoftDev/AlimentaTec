import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: k => delete store[k] };


const base = new URL("../src/utils/", import.meta.url).href;
const { SlidingWindowLimiter, checkCommandRate, checkExportRate } = await import(base + "rateLimiter.js");
const lock = await import(base + "lockout.js");
const { csvCell, toCsv } = await import(base + "csv.js");
const c = await import(base + "crypto.js");
const { sanitizeText, cleanDetails } = await import(base + "sanitize.js");
const { verifyAuditChain, hashBody, pickBody } = await import(base + "auditChain.js");

// rate limiter
let r = checkCommandRate("D1", 1000); assert.equal(r.allowed, true);
r = checkCommandRate("D1", 2000); assert.equal(r.allowed, false); // ráfaga <10s
r = checkCommandRate("D1", 12000); assert.equal(r.allowed, true);
for (let i = 0; i < 3; i++) assert.equal(checkCommandRate("D1", 30000 + i * 11000).allowed, true);
assert.equal(checkCommandRate("D1", 70000).allowed, false); // 6º en 10 min
assert.equal(checkCommandRate("D2", 70000).allowed, true); // otro dispositivo
assert.equal(checkExportRate("u", 0).allowed && checkExportRate("u", 1).allowed && checkExportRate("u", 2).allowed, true);
assert.equal(checkExportRate("u", 3).allowed, false);

// lockout
const t0 = 1_000_000;
for (let i = 0; i < 4; i++) lock.registerFailure(t0 + i);
assert.equal(lock.getLockRemainingMs(t0 + 10), 0);
lock.registerFailure(t0 + 5);
assert.equal(lock.getLockRemainingMs(t0 + 6) > 4 * 60_000, true);
lock.registerSuccess(); assert.equal(lock.getLockRemainingMs(t0 + 6), 0);

// csv injection
assert.equal(csvCell("=HYPERLINK(\"x\")").startsWith("\"'="), true);
assert.equal(csvCell("@cmd"), "'@cmd");
assert.equal(csvCell(-5), "-5");
assert.equal(csvCell('a,"b"'), '"a,""b"""');
assert.ok(toCsv(["a", "b"], [[1, "x"]]).includes("\r\n"));

// sanitize
assert.equal(sanitizeText("  <script>alert(1)</script>\n\t x "), "script alert(1) /script x");
assert.deepEqual(cleanDetails({ a: 1, b: "<b>hi</b>", c: undefined, d: true }), { a: 1, b: "b hi /b", d: true });

// crypto
const tok = c.randomToken(32); assert.ok(tok.length >= 42 && /^[A-Za-z0-9_-]+$/.test(tok));
assert.deepEqual([...c.b64u.dec(c.b64u.enc(new Uint8Array([1, 2, 250, 255])))], [1, 2, 250, 255]);
assert.equal((await c.sha256Hex("abc")).slice(0, 8), "ba7816bf");
const salt = c.randomBytes(16);
const h1 = await c.pbkdf2Hash("123456", salt, 1000), h2 = await c.pbkdf2Hash("123456", salt, 1000), h3 = await c.pbkdf2Hash("123457", salt, 1000);
assert.ok(c.timingSafeEqual(h1, h2) && !c.timingSafeEqual(h1, h3));
assert.equal(c.canonicalize({ b: 1, a: [2, { d: 1, c: undefined }] }), '{"a":[2,{"d":1}],"b":1}');
const kp = await c.generateSigningKeyPair(); const pub = await c.importPublicKey(kp.publicJwk);
const sig = await c.signPayload(kp.privateKey, "hola");
assert.equal(await c.verifySignature(pub, "hola", sig), true);
assert.equal(await c.verifySignature(pub, "hola!", sig), false);

// cadena de auditoría
async function mk(seq, prevHash, type) {
  const body = { type, severity: "info", target: "T", details: { n: seq }, uid: "u", email: "a@b.c", role: "operador", sessionId: "S1", seq, prevHash, clientTs: 1000 + seq };
  return { ...body, hash: await hashBody(body), ts: new Date() };
}
const e1 = await mk(1, "GENESIS", "login"); const e2 = await mk(2, e1.hash, "dispense_manual"); const e3 = await mk(3, e2.hash, "logout");
let v = await verifyAuditChain([e3, e1, e2]); assert.equal(v.anomalies.length, 0); assert.equal(v.checked, 3);
v = await verifyAuditChain([e1, e3]); assert.equal(v.anomalies.some(a => a.kind === "faltante"), true); // borrado detectado
v = await verifyAuditChain([e1, { ...e2, details: { n: 99 } }, e3]); assert.equal(v.anomalies.some(a => a.kind === "modificado"), true); // alteración detectada
console.log("TODAS LAS PRUEBAS PASARON ✔");
