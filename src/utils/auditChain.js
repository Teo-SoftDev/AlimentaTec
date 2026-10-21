// src/utils/auditChain.js — A09: integridad de los registros de auditoría.
// Cada sesión mantiene su propia cadena: seq consecutivo + hash del cuerpo +
// hash del registro previo. Si alguien modifica o BORRA un registro, la
// verificación detecta "modificado", "faltante" o "cadena" rota.
import { canonicalize, sha256Hex } from "./crypto.js";

export const AUDIT_BODY_KEYS = [
  "type", "severity", "target", "details", "uid", "email", "role", "sessionId", "seq", "prevHash", "clientTs",
];

export function pickBody(entry) {
  const b = {};
  for (const k of AUDIT_BODY_KEYS) b[k] = entry[k];
  return b;
}

export const hashBody = (body) => sha256Hex(canonicalize(body));

export async function verifyAuditChain(entries) {
  const bySession = new Map();
  for (const e of entries) {
    if (!e.sessionId || typeof e.seq !== "number" || !e.hash) continue;
    if (!bySession.has(e.sessionId)) bySession.set(e.sessionId, []);
    bySession.get(e.sessionId).push(e);
  }
  const anomalies = [];
  let checked = 0;
  for (const [sessionId, list] of bySession) {
    list.sort((a, b) => a.seq - b.seq);
    let prev = null;
    for (const e of list) {
      checked++;
      if ((await hashBody(pickBody(e))) !== e.hash) anomalies.push({ sessionId, seq: e.seq, kind: "modificado" });
      if (prev) {
        if (e.seq === prev.seq) anomalies.push({ sessionId, seq: e.seq, kind: "duplicado" });
        else if (e.seq !== prev.seq + 1)
          anomalies.push({ sessionId, seq: e.seq, kind: "faltante", detail: `faltan ${e.seq - prev.seq - 1} registro(s)` });
        else if (e.prevHash !== prev.hash) anomalies.push({ sessionId, seq: e.seq, kind: "cadena" });
      } else if (e.seq === 1 && e.prevHash !== "GENESIS") {
        anomalies.push({ sessionId, seq: e.seq, kind: "cadena" });
      }
      prev = e;
    }
  }
  return { checked, anomalies };
}
