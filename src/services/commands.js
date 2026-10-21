// src/services/commands.js — Envío de comandos a actuadores/tolvas.
// A01: valida permiso de rol · A03: valida con Zod · A04: rate limiting ·
// A09: cada comando queda auditado. La parada de emergencia NO se limita
// (es una acción de seguridad), pero sí se audita como evento crítico.
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { can } from "../utils/permissions.js";
import { commandSchema } from "../utils/validation.js";
import { AppError } from "../utils/errors.js";
import { checkCommandRate, formatRetry } from "../utils/rateLimiter.js";
import { writeAudit } from "./audit.js";

export async function sendCommand({ actor, command }) {
  if (!actor?.uid || !can(actor.role, "command")) {
    throw new AppError("forbidden", "Su rol no permite enviar comandos a los dispositivos.");
  }
  const parsed = commandSchema.safeParse(command);
  if (!parsed.success) throw new AppError("invalid", "Los parámetros del comando no son válidos.");
  const cmd = parsed.data;

  if (cmd.type !== "emergency_stop") {
    const rate = checkCommandRate(cmd.deviceId);
    if (!rate.allowed) {
      throw new AppError("rate_limited", `Límite de comandos alcanzado para este equipo. Reintente en ${formatRetry(rate.retryAfterMs)}.`, {
        retryAfterMs: rate.retryAfterMs,
      });
    }
  }

  const payload = Object.fromEntries(Object.entries(cmd).filter(([, v]) => v !== undefined));
  await addDoc(collection(db, "commands"), { ...payload, uid: actor.uid, status: "pending", ts: serverTimestamp() });

  await writeAudit({
    actor,
    type: cmd.type,
    target: cmd.deviceId,
    severity: cmd.type === "emergency_stop" ? "critical" : "info",
    details: { amountG: cmd.amountG, rations: cmd.rations, pond: cmd.pondId, enabled: cmd.enabled },
  });
  return cmd;
}
