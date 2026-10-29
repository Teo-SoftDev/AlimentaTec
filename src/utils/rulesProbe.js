// src/utils/rulesProbe.js — Detecta si las reglas de Firestore desplegadas están desactualizadas.
// Lee meta/rules-v3 (documento inexistente): con las reglas nuevas responde "no existe" (sin error);
// con reglas antiguas (denegar por defecto) responde permission-denied.
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

let cached = null;
export async function rulesAreCurrent() {
  if (cached !== null) return cached;
  try {
    await getDoc(doc(db, "meta", "rules-v3"));
    cached = true;
  } catch (e) {
    cached = e?.code === "permission-denied" ? false : true; // otros errores (red) no implican reglas viejas
  }
  return cached;
}
export const resetRulesProbe = () => { cached = null; };

export const RULES_HINT = "Las reglas de Firestore publicadas en su proyecto están desactualizadas. Ejecute en la carpeta del proyecto:  firebase deploy --only firestore:rules";

// Explica un permission-denied al administrador con datos útiles (sin filtrar nada sensible).
export function explainDenied({ role, claimRole, profileRole, outdated }) {
  if (outdated) return RULES_HINT;
  if (claimRole && claimRole !== profileRole)
    return `Su token de sesión indica el rol «${claimRole}» pero su perfil dice «${profileRole || "sin rol"}». Cierre sesión y vuelva a entrar (o ejecute scripts/set-role.mjs para unificarlos).`;
  if (role !== "admin") return `Su rol efectivo es «${role}»: solo un Administrador puede hacerlo.`;
  return "El servidor rechazó la operación. Verifique que su cuenta esté habilitada y que las reglas de Firestore estén publicadas (firebase deploy --only firestore:rules).";
}
