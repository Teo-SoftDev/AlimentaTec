// src/utils/telemetry.js — Anti "Sensor Spoofing" (OWASP A04/A08/A09).
// Cada paquete de telemetría viaja firmado con ECDSA P-256 por el dispositivo
// (clave privada solo en el nodo IoT). La app conserva únicamente la CLAVE
// PÚBLICA de cada dispositivo registrado y rechaza paquetes con:
//   unknown_device · stale (reloj fuera de ±30 s) · replay (nonce repetido)
//   bad_schema (valores fuera de rango físico) · bad_signature
import { z } from "zod";
import { canonicalize, generateSigningKeyPair, importPublicKey, randomToken, signPayload, verifySignature } from "./crypto.js";

export const telemetrySchema = z.object({
  deviceId: z.string().regex(/^[A-Za-z0-9-]{3,32}$/),
  ts: z.number().int(),
  nonce: z.string().min(8).max(64),
  readings: z.object({
    ph: z.number().min(0).max(14),
    oxygen: z.number().min(0).max(25),
    temperature: z.number().min(-5).max(45),
    turbidity: z.number().min(0).max(1000),
  }),
});

export const REJECT_REASONS = {
  unknown_device: "Dispositivo no registrado",
  stale: "Marca de tiempo fuera de ventana",
  replay: "Paquete repetido (replay)",
  bad_schema: "Valores fuera de rango físico",
  bad_signature: "Firma inválida (posible suplantación)",
};

export class TelemetryVerifier {
  constructor({ maxSkewMs = 30_000 } = {}) {
    this.maxSkewMs = maxSkewMs;
    this.keys = new Map(); // deviceId -> CryptoKey (pública)
    this.nonces = new Map(); // nonce -> ts
  }
  async registerDevice(deviceId, publicJwk) {
    this.keys.set(deviceId, await importPublicKey(publicJwk));
  }
  async verify(packet, signature, now = Date.now()) {
    const parsed = telemetrySchema.safeParse(packet);
    if (!parsed.success) return { ok: false, reason: "bad_schema" };
    const p = parsed.data;
    const key = this.keys.get(p.deviceId);
    if (!key) return { ok: false, reason: "unknown_device" };
    if (Math.abs(now - p.ts) > this.maxSkewMs) return { ok: false, reason: "stale" };
    for (const [n, t] of this.nonces) if (now - t > this.maxSkewMs * 2) this.nonces.delete(n);
    if (this.nonces.has(p.nonce)) return { ok: false, reason: "replay" };
    if (!(await verifySignature(key, canonicalize(p), signature))) return { ok: false, reason: "bad_signature" };
    this.nonces.set(p.nonce, now);
    return { ok: true, packet: p };
  }
}

// Nodo IoT simulado (solo demostración): conserva la clave privada en memoria.
export async function createSimulatedDevice(deviceId) {
  const { privateKey, publicJwk } = await generateSigningKeyPair();
  return {
    deviceId,
    publicJwk,
    async emit(readings, { tamper = false } = {}) {
      const packet = { deviceId, ts: Date.now(), nonce: randomToken(9), readings };
      const signature = await signPayload(privateKey, canonicalize(packet));
      if (tamper) {
        // Un atacante altera la lectura DESPUÉS de firmada.
        return { packet: { ...packet, readings: { ...readings, oxygen: Math.max(0, readings.oxygen - 3.5) } }, signature };
      }
      return { packet, signature };
    },
  };
}
