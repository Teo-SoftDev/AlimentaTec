// Almacén Firestore (firebase-admin). Las reglas de seguridad NO aplican al Admin SDK:
// por eso toda validación/autorización ocurre aquí, en el servicio.
import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

export function createFirestoreStore() {
  if (!getApps().length) initializeApp();
  const db = getFirestore();
  return {
    async getDevice(id) {
      const s = await db.doc(`devices/${id}`).get();
      if (!s.exists) return null;
      const d = s.data();
      return { id, status: d.status, pondId: d.pondId, type: d.type, name: d.name };
    },
    async getCredentialHash(id) {
      const s = await db.doc(`deviceSecrets/${id}`).get();
      return s.exists ? s.data().credentialHash || null : null;
    },
    async saveTelemetry(id, data) {
      try {
        await db.doc(`telemetry/${id}`).create({ ...data, expiresAt: Timestamp.fromMillis(data.expiresAtMs), receivedAt: FieldValue.serverTimestamp() });
        return "created";
      } catch (e) {
        if (e.code === 6 || /ALREADY_EXISTS/.test(String(e.message))) return "duplicate";
        throw e;
      }
    },
    async touchDevice(id, patch) {
      const { lastSeenMs, ...rest } = patch;
      const upd = { ...rest };
      if (lastSeenMs) { upd.lastSeen = Timestamp.fromMillis(lastSeenMs); upd.lastSeenMs = lastSeenMs; }
      await db.doc(`devices/${id}`).update(upd);
    },
    async getPondStatus(id) {
      const s = await db.doc(`pondStatus/${id}`).get();
      return s.exists ? s.data() : null;
    },
    async setPondStatus(id, data) {
      await db.doc(`pondStatus/${id}`).set({ ...data, updatedAt: FieldValue.serverTimestamp() });
    },
    async createAlert(a) { await db.collection("alerts").add({ ...a, ts: FieldValue.serverTimestamp() }); },
    async createSecurityAlert(a) { await db.collection("securityAlerts").add({ ...a, acknowledged: false, ts: FieldValue.serverTimestamp() }); },
    async withAuditChain(fn) {
      const ref = db.doc("counters/apiAudit");
      await db.runTransaction(async (tx) => {
        const s = await tx.get(ref);
        const prev = s.exists ? s.data() : { seq: 0, hash: "GENESIS" };
        const entry = fn({ seq: prev.seq, hash: prev.hash });
        if (!entry) return;
        tx.set(db.collection("auditLogs").doc(), { ...entry, ts: FieldValue.serverTimestamp() });
        tx.set(ref, { seq: entry.seq, hash: entry.hash });
      });
    },
    async listStaleOnlineDevices(cutoffMs) {
      const q = await db.collection("devices").where("status", "==", "online").where("lastSeenMs", "<", cutoffMs).limit(200).get();
      return q.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
  };
}
