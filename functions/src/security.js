// A02/A07: primitivas de seguridad sin dependencias. Nada de secretos en el código.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const sha256Hex = (s) => createHash("sha256").update(s).digest("hex");

export function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export const requestId = () => randomBytes(8).toString("hex");

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const fromB64u = (s) => Buffer.from(s, "base64url");

/** JWT HS256 de corta vida emitido por la API a un dispositivo ya autenticado con su API key. */
export function signJwt(payload, secret, ttlSec, now = Date.now()) {
  if (!secret || secret.length < 32) throw new Error("jwt_secret_missing");
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(now / 1000);
  const body = { ...payload, iat, exp: iat + ttlSec, iss: "alimentatec-api", aud: "alimentatec-devices" };
  const data = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(body))}`;
  return `${data}.${b64u(createHmac("sha256", secret).update(data).digest())}`;
}

export function verifyJwt(token, secret, now = Date.now()) {
  if (!secret || secret.length < 32) return { ok: false, reason: "jwt_disabled" };
  const parts = String(token).split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  try {
    const header = JSON.parse(fromB64u(parts[0]).toString());
    if (header.alg !== "HS256") return { ok: false, reason: "alg" }; // evita alg=none / confusión de algoritmo
    const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
    const given = fromB64u(parts[2]);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "signature" };
    const p = JSON.parse(fromB64u(parts[1]).toString());
    if (p.iss !== "alimentatec-api" || p.aud !== "alimentatec-devices") return { ok: false, reason: "claims" };
    if (typeof p.exp !== "number" || p.exp * 1000 <= now) return { ok: false, reason: "expired" };
    return { ok: true, payload: p };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  const first = typeof xff === "string" ? xff.split(",")[0].trim() : "";
  return (first || req.socket?.remoteAddress || "unknown").slice(0, 64);
}

// Cadena canónica idéntica a la del front (src/utils/crypto.js) para la cadena de auditoría.
export function canonicalize(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonicalize(v[k]))
      .join(",") +
    "}"
  );
}

export const sanitize = (v, max = 200) => String(v ?? "").replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

// Detalles de auditoría: solo primitivos saneados (misma regla que el front).
export function cleanDetails(d) {
  const out = {};
  for (const [k, v] of Object.entries(d || {})) {
    if (v === undefined || v === null) continue;
    const key = sanitize(k, 32);
    if (!key) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean") out[key] = v;
    else out[key] = sanitize(String(v), 300);
  }
  return out;
}
