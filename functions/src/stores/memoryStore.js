// Almacén en memoria para pruebas y desarrollo local (misma interfaz que Firestore).
export function createMemoryStore() {
  const devices = new Map();
  const secrets = new Map();
  const telemetry = new Map();
  const pond = new Map();
  const state = { alerts: [], securityAlerts: [], audit: [], chain: { seq: 0, hash: "GENESIS" } };
  return {
    _state: state, _devices: devices, _telemetry: telemetry, _pond: pond,
    addDevice(d, credentialHash) { devices.set(d.id, { ...d }); secrets.set(d.id, credentialHash); },
    async getDevice(id) { const d = devices.get(id); return d ? { ...d } : null; },
    async getCredentialHash(id) { return secrets.get(id) ?? null; },
    async saveTelemetry(id, data) { if (telemetry.has(id)) return "duplicate"; telemetry.set(id, data); return "created"; },
    async touchDevice(id, patch) { const d = devices.get(id); if (d) Object.assign(d, patch); },
    async getPondStatus(id) { const p = pond.get(id); return p ? structuredClone(p) : null; },
    async setPondStatus(id, data) { pond.set(id, structuredClone(data)); },
    async createAlert(a) { state.alerts.push(a); },
    async createSecurityAlert(a) { state.securityAlerts.push(a); },
    async withAuditChain(fn) {
      const entry = fn({ ...state.chain });
      if (!entry) return;
      state.audit.push(entry);
      state.chain = { seq: entry.seq, hash: entry.hash };
    },
    async listStaleOnlineDevices(cutoffMs) {
      return [...devices.values()].filter((d) => d.status === "online" && (d.lastSeenMs || 0) < cutoffMs).map((d) => ({ ...d }));
    },
  };
}
