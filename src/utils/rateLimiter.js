// src/utils/rateLimiter.js — A04 Insecure Design: límites de tasa en comandos
// a actuadores para evitar sobre-alimentación accidental o maliciosa.
// NOTA: es una defensa en el cliente (UX + primera barrera). El límite
// autoritativo debe replicarse en el backend (Cloud Functions / broker).

export class SlidingWindowLimiter {
  constructor({ max, windowMs }) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = new Map();
  }
  _recent(key, now) {
    const arr = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    this.hits.set(key, arr);
    return arr;
  }
  peek(key, now = Date.now()) {
    const arr = this._recent(key, now);
    if (arr.length >= this.max) return { allowed: false, retryAfterMs: this.windowMs - (now - arr[0]) };
    return { allowed: true, retryAfterMs: 0 };
  }
  consume(key, now = Date.now()) {
    this._recent(key, now).push(now);
  }
}

export const LIMITS = {
  commandPerDevice: { max: 5, windowMs: 10 * 60_000 }, // 5 comandos / 10 min / dispositivo
  commandGlobal: { max: 20, windowMs: 10 * 60_000 }, // 20 comandos / 10 min en total
  commandBurst: { max: 1, windowMs: 10_000 }, // intervalo mínimo 10 s por dispositivo
  exports: { max: 3, windowMs: 60_000 },
  registrations: { max: 5, windowMs: 10 * 60_000 },
  writes: { max: 20, windowMs: 60_000 },
};

const perDevice = new SlidingWindowLimiter(LIMITS.commandPerDevice);
const global = new SlidingWindowLimiter(LIMITS.commandGlobal);
const burst = new SlidingWindowLimiter(LIMITS.commandBurst);
const exportsL = new SlidingWindowLimiter(LIMITS.exports);
const registrations = new SlidingWindowLimiter(LIMITS.registrations);
const writes = new SlidingWindowLimiter(LIMITS.writes);

function checkAll(pairs, now) {
  const results = pairs.map(([l, k]) => l.peek(k, now));
  const denied = results.filter((r) => !r.allowed);
  if (denied.length) return { allowed: false, retryAfterMs: Math.max(...denied.map((r) => r.retryAfterMs)) };
  pairs.forEach(([l, k]) => l.consume(k, now));
  return { allowed: true, retryAfterMs: 0 };
}

export const checkCommandRate = (deviceId, now = Date.now()) =>
  checkAll([[perDevice, deviceId], [global, "all"], [burst, deviceId]], now);
export const checkExportRate = (uid, now = Date.now()) => checkAll([[exportsL, uid]], now);
export const checkRegistrationRate = (uid, now = Date.now()) => checkAll([[registrations, uid]], now);
export const checkWriteRate = (uid, now = Date.now()) => checkAll([[writes, uid]], now);

export function formatRetry(ms) {
  const s = Math.max(1, Math.ceil(ms / 1000));
  return s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s`;
}
