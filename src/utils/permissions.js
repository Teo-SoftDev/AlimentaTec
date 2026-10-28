// src/utils/permissions.js — A01 Broken Access Control: matriz de permisos por rol.
// La UI oculta/deshabilita acciones, pero la autoridad real son las reglas de
// Firestore (firestore.rules), que replican esta misma matriz.
export const ROLES = ["admin", "operador", "auditor", "cuidador"];
export const ROLE_LABELS = { admin: "Administrador", operador: "Operador", auditor: "Auditor (solo lectura)", cuidador: "Cuidador" };

const MATRIX = {
  admin: ["view", "advanced:view", "caretaker:view", "simulator:view", "simulator:control", "command", "schedule:write", "dosing:write", "animals:write", "animals:delete", "devices:write", "devices:revoke", "reports:export", "audit:view", "security:view"],
  operador: ["view", "advanced:view", "caretaker:view", "simulator:view", "simulator:control", "command", "schedule:write", "dosing:write", "animals:write", "audit:view"],
  auditor: ["view", "advanced:view", "caretaker:view", "simulator:view", "audit:view", "reports:export"],
  // Cuidador: vista simplificada y solo las acciones de campo (dar de comer / pausar).
  cuidador: ["view", "caretaker:view", "command"],
};

export const can = (role, permission) => !!MATRIX[role]?.includes(permission);
export const homeFor = (role) => (role === "cuidador" ? "/cuidador" : "/dashboard");
