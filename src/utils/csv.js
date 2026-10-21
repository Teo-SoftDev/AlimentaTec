// src/utils/csv.js — Exportación CSV segura (A03): neutraliza "CSV/Formula
// Injection" (celdas que empiezan con = + - @) y escapa comillas/saltos.

export function csvCell(v) {
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",;\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) lines.push(r.map(csvCell).join(","));
  return "\ufeff" + lines.join("\r\n"); // BOM para Excel/UTF-8
}

export function downloadBlob(filename, blob) {
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
