// Núcleo de la API de ingesta. Sin dependencias de HTTP: lo usan tanto el handler REST
// como el canal WebSocket, y se prueba con un almacén en memoria.
import { ALERT_TEXT, statusFor, worst } from "./thresholds.js";
import { batchSchema, headersSchema, telemetrySchema, toMillis } from "./schemas.js";
import { safeEqualHex, sanitize, sha256Hex, signJwt, verifyJwt } from "./security.js";

const DUMMY_HASH = sha256Hex("dummy-credential-for-constant-time-compare");

export class ApiError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }
}

export function createIngestService({ store, config, limiters, audit, clock = Date.now, jwtSecret = () => process.env.JWT_SECRET }) {
  /** Autentica con API key (Bearer <clave>) o JWT de corta vida (Bearer <jwt>). */
  async function authenticate({ deviceId: rawId, authorization, ip }) {
    const now = clock();
    const blocked = limiters.authFail.peek(ip, now);
    if (!blocked.allowed) throw new ApiError(429, "too_many_auth_failures", "Demasiados intentos fallidos. Reintente más tarde.", { retryAfterSec: blocked.retryAfterSec });

    const fail = async (reason, deviceId) => {
      const r = limiters.authFail.take(ip, now);
      await audit.log({ type: "api_auth_failed", target: deviceId || "unknown", details: { motivo: reason, ip } });
      if (!r.allowed || r.remaining === 0) {
        await store.createSecurityAlert({ kind: "api_bruteforce", detail: sanitize(`Múltiples fallos de autenticación en la API desde ${ip} (último motivo: ${reason}).`, 300), uid: "api", email: "api@alimentatec", sessionId: "api-gateway" });
      }
      // Respuesta genérica: no revela si el dispositivo existe ni por qué falló.
      throw new ApiError(401, "unauthorized", "Credenciales inválidas.");
    };

    const h = headersSchema.safeParse({ deviceId: rawId, key: String(authorization || "").replace(/^Bearer\s+/i, "") });
    if (!h.success || !/^Bearer\s+/i.test(String(authorization || ""))) return fail("cabeceras_invalidas", sanitize(rawId, 40));
    const { deviceId, key } = h.data;

    const device = await store.getDevice(deviceId);
    const isJwt = key.split(".").length === 3 && key.startsWith("eyJ");
    let valid = false;
    if (isJwt) {
      const v = verifyJwt(key, jwtSecret(), now);
      valid = v.ok && v.payload.sub === deviceId;
      if (!valid) return fail(`jwt_${v.reason || "sub"}`, deviceId);
    } else {
      const stored = (device && (await store.getCredentialHash(deviceId))) || DUMMY_HASH; // tiempo constante
      valid = safeEqualHex(sha256Hex(key), stored) && !!device;
      if (!valid) return fail("clave_invalida", deviceId);
    }
    if (!device) return fail("dispositivo_desconocido", deviceId);
    if (device.status === "revoked") return fail("dispositivo_revocado", deviceId);

    return { device: { ...device, id: deviceId } };
  }

  function takeDeviceRate(deviceId, bucket = "single") {
    const now = clock();
    const key = `${deviceId}:${bucket}`;
    const r = bucket === "batch" ? limiters.deviceBatch.take(key, now) : limiters.device.take(key, now);
    return r;
  }

  async function enforceRate(device, bucket) {
    const r = takeDeviceRate(device.id, bucket);
    if (!r.allowed) {
      await audit.log({ type: "api_rate_limited", target: device.id, details: { bucket } });
      throw new ApiError(429, "rate_limited", "Límite de peticiones por dispositivo excedido.", { retryAfterSec: r.retryAfterSec });
    }
  }

  async function issueToken(device) {
    const secret = jwtSecret();
    if (!secret || secret.length < 32) throw new ApiError(503, "jwt_disabled", "La emisión de tokens no está configurada.");
    const token = signJwt({ sub: device.id }, secret, config.jwtTtlSec, clock());
    return { token, tokenType: "Bearer", expiresIn: config.jwtTtlSec };
  }

  function validationIssues(error) {
    return error.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: sanitize(i.message, 120) }));
  }

  /** Procesa UNA lectura ya autenticada. Devuelve {status, id?, pondStatus?} o lanza ApiError. */
  async function ingestOne(device, body) {
    const now = clock();
    const p = telemetrySchema.safeParse(body);
    if (!p.success) {
      await audit.log({ type: "api_invalid_payload", target: device.id, details: { campos: p.error.issues.slice(0, 3).map((i) => i.path.join(".")).join(",") } });
      throw new ApiError(422, "invalid_payload", "Payload inválido.", { issues: validationIssues(p.error) });
    }
    const t = p.data;
    if (device.type !== "sensor") {
      await audit.log({ type: "api_forbidden_device_type", target: device.id, severity: "critical", details: { tipo: device.type || "?" } });
      throw new ApiError(403, "forbidden", "Este dispositivo no está autorizado para enviar telemetría.");
    }
    if (device.pondId !== t.pondId) {
      await audit.log({ type: "api_pond_mismatch", target: device.id, severity: "critical", details: { esperado: device.pondId, recibido: t.pondId } });
      throw new ApiError(403, "forbidden", "El dispositivo no pertenece a ese estanque.");
    }
    const measuredAt = toMillis(t.ts) ?? now;
    if (!Number.isFinite(measuredAt) || measuredAt > now + config.maxFutureSkewMs) {
      await audit.log({ type: "api_invalid_payload", target: device.id, details: { motivo: "timestamp_futuro" } });
      throw new ApiError(422, "invalid_timestamp", "La marca de tiempo está en el futuro.");
    }
    if (now - measuredAt > config.maxPastAgeMs) {
      await audit.log({ type: "api_invalid_payload", target: device.id, details: { motivo: "lectura_antigua" } });
      throw new ApiError(422, "stale_reading", "La lectura es demasiado antigua.");
    }

    const id = `${device.id}_${t.readingId}`;
    const saved = await store.saveTelemetry(id, {
      deviceId: device.id, pondId: t.pondId, sensorType: t.sensorType, readings: t.readings,
      battery: t.battery ?? null, rssi: t.rssi ?? null, firmware: t.firmware ?? null,
      measuredAtMs: measuredAt, receivedAtMs: now, expiresAtMs: now + config.telemetryTtlDays * 86_400_000,
    });
    if (saved === "duplicate") return { status: "duplicate", id };

    const overall = await updatePondStatus(device, t, measuredAt, now);
    const patch = { status: "online", lastSeenMs: now };
    if (t.battery !== undefined) patch.battery = t.battery;
    if (t.rssi !== undefined) patch.rssi = t.rssi;
    if (t.firmware) patch.firmware = t.firmware;
    await store.touchDevice(device.id, patch);
    return { status: "accepted", id, pondStatus: overall };
  }

  async function updatePondStatus(device, t, measuredAt, now) {
    const cur = (await store.getPondStatus(t.pondId)) || { pondId: t.pondId, metrics: {}, lastAlert: {} };
    const metrics = { ...cur.metrics };
    const lastAlert = { ...(cur.lastAlert || {}) };
    for (const [metric, value] of Object.entries(t.readings)) {
      if (metrics[metric] && metrics[metric].atMs > measuredAt) continue; // un dato bufferizado viejo no pisa uno más reciente
      metrics[metric] = { value, status: statusFor(metric, value), atMs: measuredAt, deviceId: device.id };
    }
    const overall = worst(Object.values(metrics).map((m) => m.status));
    // Alerta automática crítica (con antirrebote) solo para lecturas recientes.
    if (now - measuredAt < 10 * 60_000) {
      for (const [metric, value] of Object.entries(t.readings)) {
        if (statusFor(metric, value) !== "crit") continue;
        if (now - (lastAlert[metric] || 0) < config.alertDebounceMs) continue;
        lastAlert[metric] = now;
        await store.createAlert({ severity: "critical", metric, value, pond: t.pondId, message: ALERT_TEXT[metric](value), uid: "api" });
      }
    }
    await store.setPondStatus(t.pondId, { pondId: t.pondId, status: overall, metrics, lastAlert, updatedAtMs: now });
    return overall;
  }

  async function ingestBatch(device, body) {
    const p = batchSchema.safeParse(body);
    if (!p.success) {
      await audit.log({ type: "api_invalid_payload", target: device.id, details: { campos: "batch" } });
      throw new ApiError(422, "invalid_payload", "Payload inválido.", { issues: validationIssues(p.error) });
    }
    if (p.data.readings.length > config.batchMax) throw new ApiError(413, "batch_too_large", `Máximo ${config.batchMax} lecturas por lote.`);
    const results = [];
    for (const r of p.data.readings) {
      try {
        const out = await ingestOne(device, r);
        results.push({ readingId: r.readingId, status: out.status });
      } catch (e) {
        if (!(e instanceof ApiError)) throw e;
        results.push({ readingId: r.readingId, status: "rejected", error: e.code });
      }
    }
    return { results, accepted: results.filter((r) => r.status === "accepted").length, duplicates: results.filter((r) => r.status === "duplicate").length, rejected: results.filter((r) => r.status === "rejected").length };
  }

  /** Tarea programada: marca como "offline" los sensores sin señal y avisa. */
  async function markStaleOffline() {
    const stale = await store.listStaleOnlineDevices(clock() - config.staleOnlineMs);
    for (const d of stale) {
      await store.touchDevice(d.id, { status: "offline" });
      if (d.type === "sensor") await store.createAlert({ severity: "warning", metric: "sensor", pond: d.pondId, message: `Sensor ${d.id} sin conexión`, uid: "api" });
      await audit.log({ type: "api_device_offline", target: d.id, severity: "warning", details: { pond: d.pondId } });
    }
    return stale.length;
  }

  return { authenticate, enforceRate, issueToken, ingestOne, ingestBatch, markStaleOffline };
}
