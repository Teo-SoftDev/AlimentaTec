// Servidor independiente (Cloud Run / local): REST + WebSocket.
//   STORE=memory node src/server.js      → desarrollo local sin Firebase (imprime una API key efímera)
//   STORE=firestore node src/server.js   → usa firebase-admin (credenciales por entorno)
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { buildApi } from "./app.js";
import { sha256Hex } from "./security.js";
import { createMemoryStore } from "./stores/memoryStore.js";
import { createFirestoreStore } from "./stores/firestoreStore.js";
import { attachWebSocket } from "./wsServer.js";
import { pathToFileURL } from "node:url";

export async function startServer({ store, port = 0, env = process.env, clock, jwtSecret, ws = true } = {}) {
  const api = buildApi({ store, env, clock, jwtSecret });
  const server = createServer(api.handler);
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  if (ws) await attachWebSocket(server, api);
  await new Promise((r) => server.listen(port, r));
  return { server, api, port: server.address().port, close: () => new Promise((r) => server.close(r)) };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.STORE || "memory";
  let store, jwt = process.env.JWT_SECRET;
  if (mode === "firestore") {
    store = (await import("./stores/firestoreStore.js")).createFirestoreStore();
  } else {
    store = createMemoryStore();
    const key = randomBytes(24).toString("base64url"); // efímera: se genera en cada arranque, nunca se versiona
    const id = process.env.DEV_DEVICE_ID || "SN-SIM001";
    store.addDevice({ id, type: "sensor", pondId: process.env.DEV_POND_ID || "AQ-04", status: "offline" }, sha256Hex(key));
    jwt = jwt || randomBytes(32).toString("hex");
    console.log(`\n[dev] Dispositivo de prueba: ${id}\n[dev] API key (efímera): ${key}\n`);
  }
  const { port } = await startServer({ store, port: Number(process.env.PORT || 8080), jwtSecret: () => jwt });
  console.log(`API escuchando en http://localhost:${port}/api/v1  (store=${mode})`);
}