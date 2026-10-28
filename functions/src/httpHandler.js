// Handler HTTP sin framework (Node http): menos superficie de ataque y compatible con
// Firebase Functions (onRequest), Cloud Run y pruebas locales.
import { ApiError } from "./ingestService.js";
import { clientIp, requestId, sanitize } from "./security.js";

function send(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(payload), ...extraHeaders });
  res.end(payload);
}

function readJson(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const type = String(req.headers["content-type"] || "").toLowerCase();
    if (!type.startsWith("application/json")) return reject(new ApiError(415, "unsupported_media_type", "Se requiere Content-Type: application/json."));
    const declared = parseInt(req.headers["content-length"] || "0", 10);
    if (declared > maxBytes) return reject(new ApiError(413, "payload_too_large", "El cuerpo excede el tamaño permitido."));
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) { reject(new ApiError(413, "payload_too_large", "El cuerpo excede el tamaño permitido.")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new ApiError(400, "invalid_json", "JSON mal formado.")); }
    });
    req.on("error", () => reject(new ApiError(400, "read_error", "No se pudo leer la petición.")));
  });
}

export function createHandler({ service, config, limiters, audit }) {
  return async function handler(req, res) {
    const rid = requestId();
    const base = {
      "X-Request-Id": rid, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    };
    const reply = (status, body, h = {}) => send(res, status, { ...body, requestId: rid }, { ...base, ...h });
    try {
      const path = new URL(req.url, "http://localhost").pathname.replace(/\/+$/, "") || "/";
      const i = path.indexOf("/v1");
      const route = i >= 0 ? path.slice(i) : path;
      const ip = clientIp(req);

      const rl = limiters.ip.take(ip);
      if (!rl.allowed) return reply(429, { error: "rate_limited", message: "Demasiadas peticiones." }, { "Retry-After": String(rl.retryAfterSec) });

      if (req.method === "GET" && route === "/v1/health") return reply(200, { status: "ok" });
      // Sin CORS a propósito: los sensores no son navegadores. Cualquier preflight se rechaza.
      if (req.method === "OPTIONS") return reply(405, { error: "method_not_allowed", message: "Método no permitido." });

      const known = ["/v1/auth/token", "/v1/telemetry", "/v1/telemetry/batch"];
      if (!known.includes(route)) return reply(404, { error: "not_found", message: "Recurso no encontrado." });
      if (req.method !== "POST") return reply(405, { error: "method_not_allowed", message: "Método no permitido." }, { Allow: "POST" });

      const { device } = await service.authenticate({ deviceId: req.headers["x-device-id"], authorization: req.headers.authorization, ip });

      if (route === "/v1/auth/token") {
        await service.enforceRate(device, "single");
        return reply(200, await service.issueToken(device));
      }
      const body = await readJson(req, config.maxBodyBytes);
      if (route === "/v1/telemetry") {
        await service.enforceRate(device, "single");
        const out = await service.ingestOne(device, body);
        return reply(out.status === "duplicate" ? 200 : 202, out);
      }
      await service.enforceRate(device, "batch");
      const out = await service.ingestBatch(device, body);
      return reply(out.accepted + out.duplicates === 0 ? 422 : 200, out);
    } catch (e) {
      if (e instanceof ApiError) {
        const headers = e.retryAfterSec ? { "Retry-After": String(e.retryAfterSec) } : {};
        if (e.status === 413 || e.status === 415 || e.status === 400) {
          audit?.log({ type: "api_invalid_payload", target: sanitize(req.headers["x-device-id"], 40) || "unknown", details: { motivo: e.code, ip: clientIp(req) } }).catch(() => {});
        }
        return reply(e.status, { error: e.code, message: e.message, ...(e.issues ? { issues: e.issues } : {}) }, headers);
      }
      console.error("[api] error interno", rid, e?.message); // la traza queda en logs, nunca en la respuesta
      return reply(500, { error: "internal_error", message: "Error interno. Intente más tarde." });
    }
  };
}
