// A04: limitación de tasa por dispositivo / por IP (ventana deslizante en memoria
// por instancia). Con RATE_LIMIT_STORE=firestore se añade un contador compartido.
export class SlidingWindowLimiter {
  constructor({ max, windowMs }) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = new Map();
  }
  _recent(key, now) {
    const arr = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (arr.length) this.hits.set(key, arr);
    else this.hits.delete(key);
    return arr;
  }
  /** Consume un cupo si hay disponibilidad. */
  take(key, now = Date.now()) {
    const arr = this._recent(key, now);
    if (arr.length >= this.max) return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((this.windowMs - (now - arr[0])) / 1000)) };
    arr.push(now);
    this.hits.set(key, arr);
    return { allowed: true, remaining: this.max - arr.length };
  }
  /** Consulta sin consumir. */
  peek(key, now = Date.now()) {
    const arr = this._recent(key, now);
    return arr.length >= this.max
      ? { allowed: false, retryAfterSec: Math.max(1, Math.ceil((this.windowMs - (now - arr[0])) / 1000)) }
      : { allowed: true, remaining: this.max - arr.length };
  }
  /** Evita crecimiento ilimitado del mapa. */
  sweep(now = Date.now()) {
    for (const k of this.hits.keys()) this._recent(k, now);
    if (this.hits.size > 50_000) this.hits.clear();
  }
}

export function createLimiters(config) {
  return {
    device: new SlidingWindowLimiter(config.deviceRate),
    deviceBatch: new SlidingWindowLimiter({ max: Math.max(1, Math.ceil(config.deviceRate.max / 5)), windowMs: config.deviceRate.windowMs }),
    authFail: new SlidingWindowLimiter(config.authFailRate),
    ip: new SlidingWindowLimiter(config.ipRate),
  };
}
