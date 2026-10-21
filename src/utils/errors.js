// src/utils/errors.js — A05 Security Misconfiguration: nunca mostrar trazas
// técnicas ni mensajes crudos del backend al operador.
import { traducirErrorAuth } from "./authErrors.js";

export class AppError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    Object.assign(this, extra);
  }
}

const FIRESTORE = {
  "permission-denied": "No tiene permisos para realizar esta acción.",
  unauthenticated: "Su sesión expiró. Inicie sesión nuevamente.",
  unavailable: "El servicio no está disponible por ahora. Reintente en unos minutos.",
  "deadline-exceeded": "La operación tardó demasiado. Reintente.",
  "resource-exhausted": "Se superó el límite de solicitudes. Espere un momento.",
  "already-exists": "El registro ya existe.",
  "not-found": "No se encontró el registro solicitado.",
  "failed-precondition": "La operación no puede completarse en este momento.",
  cancelled: "La operación fue cancelada.",
};

export function friendlyError(err, fallback = "Ocurrió un error inesperado. Intente nuevamente.") {
  if (err instanceof AppError) return err.message;
  const code = String(err?.code || "");
  if (code.startsWith("auth/")) return traducirErrorAuth(err);
  const short = code.replace(/^firestore\//, "");
  if (FIRESTORE[short]) return FIRESTORE[short];
  if (import.meta.env?.DEV) console.error("[AlimentaTec]", err); // solo en desarrollo
  return fallback;
}
