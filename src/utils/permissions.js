// src/utils/permissions.js — A01 Broken Access Control: matriz de permisos por rol.
// La UI oculta/deshabilita acciones, pero la autoridad real son las reglas de
// Firestore (firestore.rules), que replican esta misma matriz.
export const ROLES = ["admin", "operador", "auditor"];
export const ROLE_LABELS = { admin: "Administrador", operador: "Operador", auditor: "Auditor (solo lectura)" };

const MATRIX = {
  admin: ["view", "command", "schedule:write", "dosing:write", "animals:write", "animals:delete", "devices:write", "devices:revoke", "reports:export", "audit:view", "security:view"],
  operador: ["view", "command", "schedule:write", "dosing:write", "animals:write", "audit:view"],
  auditor: ["view", "audit:view", "reports:export"],
};

export const can = (role, permission) => !!MATRIX[role]?.includes(permission);
