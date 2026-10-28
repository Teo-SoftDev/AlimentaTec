// Canal WebSocket opcional para sensores con conexión persistente (Cloud Run / servidor propio).
// Cloud Functions no admite WebSocket de larga duración: use src/server.js en Cloud Run.
import { ApiError } from "./ingestService.js";
import { clientIp } from "./security.js";

export async function attachWebSocket(server, { service, config, audit }) {
  let WebSocketServer;
  try { ({ WebSocketServer } = await import("ws")); } catch { return null; }
  const wss = new WebSocketServer({ noServer: true, maxPayload: config.maxBodyBytes });

  server.on("upgrade", async (req, socket, head) => {
    const path = new URL(req.url, "http://x").pathname;
    if (!path.endsWith("/v1/telemetry/stream")) { socket.write("HTTP/1.1 404 Not Found\r\n\r\n"); return socket.destroy(); }
    try {
      const { device } = await service.authenticate({ deviceId: req.headers["x-device-id"], authorization: req.headers.authorization, ip: clientIp(req) });
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req, device));
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 500;
      socket.write(`HTTP/1.1 ${status} ${status === 429 ? "Too Many Requests" : "Unauthorized"}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req, device) => {
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("message", async (raw) => {
      const reply = (o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
      try {
        const msg = JSON.parse(raw.toString("utf8"));
        await service.enforceRate(device, msg.type === "batch" ? "batch" : "single");
        if (msg.type === "telemetry") reply({ type: "ack", ...(await service.ingestOne(device, msg.data)) });
        else if (msg.type === "batch") reply({ type: "ack", ...(await service.ingestBatch(device, msg.data)) });
        else reply({ type: "error", error: "unknown_type" });
      } catch (e) {
        if (e instanceof ApiError) reply({ type: "error", error: e.code, ...(e.retryAfterSec ? { retryAfterSec: e.retryAfterSec } : {}), ...(e.issues ? { issues: e.issues } : {}) });
        else if (e instanceof SyntaxError) { audit?.log({ type: "api_invalid_payload", target: device.id, details: { motivo: "json_ws" } }).catch(() => {}); reply({ type: "error", error: "invalid_json" }); }
        else reply({ type: "error", error: "internal_error" });
      }
    });
  });
  const beat = setInterval(() => wss.clients.forEach((ws) => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 30_000);
  beat.unref?.();
  wss.on("close", () => clearInterval(beat));
  return wss;
}
