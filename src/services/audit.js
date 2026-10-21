// src/services/audit.js — A09 Logging & Monitoring.
// Registro de auditoría append-only: timestamp de servidor, UID, rol, ID de
// sesión y cadena de integridad (seq + hash). Las reglas de Firestore prohíben
// update/delete, por lo que el historial es de solo lectura.
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { randomToken, sha256Hex } from "../utils/crypto.js";
import { canonicalize } from "../utils/crypto.js";
import { cleanDetails, sanitizeText } from "../utils/sanitize.js";
import { hashBody } from "../utils/auditChain.js";

const SID_KEY = "at_sid";
const STATE_KEY = "at_audit_state";
const QUEUE_KEY = "at_audit_pending";

export function getSessionId() {
  try {
    let id = sessionStorage.getItem(SID_KEY);
    if (!id) {
      id = randomToken(12);
      sessionStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return "nosession";
  }
}

const readState = () => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STATE_KEY));
    if (s && typeof s.seq === "number" && typeof s.prevHash === "string") return s;
  } catch {
    /* ignorar */
  }
  return { seq: 0, prevHash: "GENESIS" };
};
const writeState = (s) => {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch {
    /* ignorar */
  }
};

// Limpieza de datos de sesión al cerrar sesión (tokens/estado no persisten).
export function clearSessionData() {
  try {
    Object.keys(sessionStorage).filter((k) => k.startsWith("at_")).forEach((k) => sessionStorage.removeItem(k));
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* ignorar */
  }
}

const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
};
const writeQueue = (q) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)));
  } catch {
    /* ignorar */
  }
};

async function flushQueue() {
  const q = readQueue();
  if (!q.length) return;
  const remaining = [];
  for (let i = 0; i < q.length; i++) {
    try {
      await addDoc(collection(db, "auditLogs"), { ...q[i], ts: serverTimestamp() });
    } catch {
      remaining.push(...q.slice(i));
      break;
    }
  }
  writeQueue(remaining);
}

export async function writeAudit({ actor, type, target = "", details = {}, severity = "info" }) {
  if (!actor?.uid) return false;
  const st = readState();
  const seq = st.seq + 1;
  const body = {
    type: sanitizeText(type).slice(0, 40),
    severity: ["info", "warning", "critical"].includes(severity) ? severity : "info",
    target: sanitizeText(target).slice(0, 80),
    details: cleanDetails(details),
    uid: actor.uid,
    email: sanitizeText(actor.email || "").slice(0, 254),
    role: actor.role,
    sessionId: actor.sessionId,
    seq,
    prevHash: st.prevHash,
    clientTs: Date.now(),
  };
  const hash = await hashBody(body);
  writeState({ seq, prevHash: hash });
  const entry = { ...body, hash };
  try {
    await flushQueue();
    await addDoc(collection(db, "auditLogs"), { ...entry, ts: serverTimestamp() });
    return true;
  } catch {
    writeQueue([...readQueue(), entry]); // se reintenta en el próximo registro
    return false;
  }
}

// Alerta de seguridad prioritaria para administradores (manipulación de logs,
// suplantación de telemetría, etc.). Las reglas permiten crearla a cualquier
// usuario autenticado y solo el admin puede leerla.
export async function raiseSecurityAlert({ actor, kind, detail }) {
  if (!actor?.uid) return false;
  try {
    await addDoc(collection(db, "securityAlerts"), {
      kind: sanitizeText(kind).slice(0, 40),
      detail: sanitizeText(detail).slice(0, 300),
      uid: actor.uid,
      email: sanitizeText(actor.email || "").slice(0, 254),
      sessionId: actor.sessionId,
      acknowledged: false,
      ts: serverTimestamp(),
    });
    return true;
  } catch {
    return false;
  }
}

export { canonicalize, sha256Hex };
