// Parámetros de seguridad de la API de ingesta (A04). Ajustables por entorno.
const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

export function loadConfig(env = process.env) {
  return {
    maxBodyBytes: int(env.API_MAX_BODY_BYTES, 16 * 1024),
    batchMax: int(env.API_BATCH_MAX, 50),
    // Límite por dispositivo (ventana deslizante)
    deviceRate: { max: int(env.API_DEVICE_RATE_MAX, 30), windowMs: int(env.API_DEVICE_RATE_WINDOW_MS, 60_000) },
    // Límite por IP para intentos de autenticación fallidos (fuerza bruta de claves)
    authFailRate: { max: int(env.API_AUTHFAIL_MAX, 10), windowMs: int(env.API_AUTHFAIL_WINDOW_MS, 15 * 60_000) },
    // Límite global por IP (cualquier petición)
    ipRate: { max: int(env.API_IP_RATE_MAX, 120), windowMs: int(env.API_IP_RATE_WINDOW_MS, 60_000) },
    jwtTtlSec: int(env.API_JWT_TTL_SEC, 15 * 60),
    maxFutureSkewMs: 5 * 60_000, // reloj del dispositivo adelantado
    maxPastAgeMs: int(env.API_MAX_PAST_AGE_MS, 7 * 24 * 3600_000), // lecturas bufferizadas offline
    alertDebounceMs: int(env.API_ALERT_DEBOUNCE_MS, 5 * 60_000),
    auditDebounceMs: int(env.API_AUDIT_DEBOUNCE_MS, 30_000),
    staleOnlineMs: int(env.API_STALE_ONLINE_MS, 5 * 60_000),
    telemetryTtlDays: int(env.API_TELEMETRY_TTL_DAYS, 30),
  };
}
