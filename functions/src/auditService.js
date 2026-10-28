// A09: auditoría centralizada de la ingesta. Misma cadena (seq + hash) que el front,
// de modo que "Historial → Verificar integridad" también cubre los eventos de la API.
import { canonicalize, cleanDetails, sanitize, sha256Hex } from "./security.js";

export function createAudit({ store, config, clock = Date.now }) {
  const recent = new Map();
  return {
    async log({ type, severity = "warning", target = "", details = {} }) {
      const key = `${type}|${target}`;
      const now = clock();
      const last = recent.get(key);
      if (last && now - last.at < config.auditDebounceMs) { last.suppressed++; return false; } // anti-inundación
      const suppressed = last?.suppressed || 0;
      recent.set(key, { at: now, suppressed: 0 });
      if (recent.size > 5000) recent.clear();
      const d = cleanDetails({ ...details, ...(suppressed ? { suprimidos: suppressed } : {}) });
      await store.withAuditChain((prev) => {
        const body = { type: sanitize(type, 40), severity, target: sanitize(target, 80), details: d, uid: "api", email: "api@alimentatec", role: "system", sessionId: "api-gateway", seq: prev.seq + 1, prevHash: prev.hash, clientTs: now };
        return { ...body, hash: sha256Hex(canonicalize(body)) };
      });
      return true;
    },
  };
}
