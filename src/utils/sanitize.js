// src/utils/sanitize.js — Sanitización sin dependencias (A03 Injection).
// React ya escapa el HTML al renderizar; esto evita que datos hostiles
// lleguen a Firestore, a CSV/PDF o a logs.

export const sanitizeText = (v) =>
  String(v ?? "")
    .replace(/[\u0000-\u001F\u007F<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const sanitizeMultiline = (v) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

// Detalles de auditoría: solo primitivos, texto saneado y truncado.
export function cleanDetails(d) {
  const out = {};
  for (const [k, v] of Object.entries(d || {})) {
    if (v === undefined || v === null) continue;
    const key = sanitizeText(k).slice(0, 32);
    if (!key) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean") out[key] = v;
    else out[key] = sanitizeText(String(v)).slice(0, 300);
  }
  return out;
}
