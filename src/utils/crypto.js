// src/utils/crypto.js — Primitivas con Web Crypto (A02 Cryptographic Failures).
// Nunca se guardan secretos en texto plano: solo hashes. Las firmas de
// telemetría usan criptografía asimétrica (la clave pública no es secreta).

const enc = new TextEncoder();

export const b64u = {
  enc(bytes) {
    let s = "";
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  dec(str) {
    const p = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
    return Uint8Array.from(atob(p), (c) => c.charCodeAt(0));
  },
};

export function randomBytes(n = 32) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export const randomToken = (n = 32) => b64u.enc(randomBytes(n));

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

// PBKDF2 para secretos de baja entropía (PIN).
export async function pbkdf2Hash(secret, salt, iterations = 150000) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return b64u.enc(new Uint8Array(bits));
}

export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// JSON canónico (claves ordenadas) para firmar / encadenar hashes.
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

// ECDSA P-256 (firma de telemetría por dispositivo).
const ECDSA = { name: "ECDSA", namedCurve: "P-256" };
const SIGN = { name: "ECDSA", hash: "SHA-256" };

export async function generateSigningKeyPair() {
  const pair = await crypto.subtle.generateKey(ECDSA, true, ["sign", "verify"]);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return { privateKey: pair.privateKey, publicJwk };
}

export const importPublicKey = (jwk) => crypto.subtle.importKey("jwk", jwk, ECDSA, true, ["verify"]);

export async function signPayload(privateKey, payload) {
  const sig = await crypto.subtle.sign(SIGN, privateKey, enc.encode(payload));
  return b64u.enc(new Uint8Array(sig));
}

export async function verifySignature(publicKey, payload, signatureB64u) {
  try {
    return await crypto.subtle.verify(SIGN, publicKey, b64u.dec(signatureB64u), enc.encode(payload));
  } catch {
    return false;
  }
}
